use std::collections::HashMap;
use std::sync::{
    atomic::{AtomicUsize, Ordering},
    Arc,
};

use futures::{FutureExt, StreamExt, SinkExt};
use tokio::sync::{mpsc, RwLock, watch};
use tokio_stream::wrappers::UnboundedReceiverStream;
use warp::ws::{Message, WebSocket};
use warp::Filter;

use uuid::Uuid;

type Users = Arc<RwLock<HashMap<Uuid, User>>>;

use tokio_postgres::{NoTls, Error, Row};
use deadpool_postgres::{Config, Manager, ManagerConfig, Pool, RecyclingMethod };
mod defs;
use crate::defs::{Outcome, PacketType, User, Stack, UserRow, SetupError, MessageError};

#[tokio::main]
async fn main(){

    //let working_dir: std::path::PathBuf = std::env::current_dir().unwrap();
    //println!("{}", working_dir.display());

    let users = Users::default();
    let users = warp::any().map(move || users.clone());
    
    let mut cfg = Config::new();
    cfg.dbname = Some("final-project".to_string());
    cfg.user = Some("aghayes".to_string());
    cfg.password = Some("cat".to_string());
    cfg.manager = Some(ManagerConfig { recycling_method: RecyclingMethod::Fast });
    let pool = cfg.create_pool(NoTls).unwrap();
    let con = &pool.get().await.unwrap();
    con.execute(
        r#"CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            uuid TEXT NOT NULL,
            hash BYTEA NOT NULL,
            salt BYTEA NOT NULL,
            darkmode BOOL);"#, &[]).await.unwrap();
    con.execute(
        r#"CREATE TABLE IF NOT EXISTS items (
            name TEXT PRIMARY KEY,
            price INT NOT NULL,
            sold INT NOT NULL);"#, &[]).await.unwrap();
    let test_get = con.prepare("SELECT * from items;").await.unwrap();
    let test_result = con.query(&test_get, &[]).await.unwrap();
    if test_result.is_empty(){
        con.execute(
            r#"INSERT INTO items (name, price, sold) 
            VALUES
            ('rice', $1, $2),
            ('broccoli', $1, $2),
            ('mushroom', $1, $2),
            ('eggplant', $1, $2),
            ('pepper', $1, $2),
            ('herbs', $1, $2),
            ('celery', $1, $2),
            ('tulip', $1, $2),
            ('sunflower', $1, $2),
            ('rose', $1, $2);"#, &[&30,&0]).await.unwrap();
    };
    let thread_run = tokio::runtime::Handle::current();
    std::thread::spawn(move || {
        async fn update(){
            let mut cfg = Config::new();
            cfg.dbname = Some("final-project".to_string());
            cfg.user = Some("aghayes".to_string());
            cfg.password = Some("cat".to_string());
            cfg.manager = Some(ManagerConfig { recycling_method: RecyclingMethod::Fast });
            let pool = cfg.create_pool(NoTls).unwrap();
            let con = &pool.get().await.unwrap();
            let mut interval = tokio::time::interval(std::time::Duration::from_secs(90));
            let sold_query = con.prepare("SELECT * from items;").await.unwrap();
            let update_query = con.prepare("UPDATE items SET sold = $1, price = $2 WHERE name=$3;").await.unwrap();
            loop{
                interval.tick().await;
                println!("update");
                let sold_rows = con.query(&sold_query, &[]).await.unwrap();
                for row in sold_rows{
                    let sold: i32 = row.get("sold");
                    let name: String = row.get("name");
                    let price: i32 = row.get("price");
                    if price >= 120{
                        con.execute(&update_query, &[&0, &30, &name]).await.unwrap();
                    }
                    else if sold > price{
                        let suppose = price-(sold * 1/2);
                        con.execute(&update_query, &[&0, {if suppose<0{&0}else{&suppose}}, &name]).await.unwrap();
                    }
                    else{
                        con.execute(&update_query, &[&0, &(price+1), &name]).await.unwrap();
                    }
                }
            }
        }
        thread_run.spawn(async {update().await});
    });
    let pool = warp::any().map(move || pool.clone());

    let index = warp::get()
        .and(warp::path::end())
        .and(warp::fs::file("./index.html"));
    let files = warp::path("static").and(warp::fs::dir("./"));
    let connect = warp::path("connect")
        .and(warp::ws()).and(users).and(pool)
        .map(|ws: warp::ws::Ws, users, pool| {
            ws.on_upgrade(move |socket| user_connected(socket, users, pool, tokio::runtime::Handle::current()))
        });

    let routes = index.or(connect).or(files);
    warp::serve(routes).run(([192, 168, 1, 110], 3030)).await;
}

async fn user_connected(ws: WebSocket, users: Users, pool: Pool, runtime: tokio::runtime::Handle){
    println!("user connected");
    
    let (user_ws_tx, mut user_ws_rx) = ws.split();
    let (tx, trx) = mpsc::unbounded_channel();
    let trx = UnboundedReceiverStream::new(trx);
    runtime.spawn(trx.forward(user_ws_tx));
    let mut u_id: Option<Uuid>;
    loop {
        if let Some(result) = user_ws_rx.next().await{
            let msg = result.unwrap();
            let user_login = setup(msg, &pool.get().await.unwrap(), tx.clone()).await;
            u_id = match user_login{
                Ok(u_id) => Some(u_id),
                _ => None
            };
            if let Some(u_id) = &u_id{println!("got uuid: {}", u_id);break;}
        }
    }
    if let Err(e) = tx.send(Ok(Message::text("LOGIN|"))){
        println!("{}",e); return
    }else{println!("logged in!")};
    let user_id = match u_id{
        Some(u) => u,
        None => return
    };
    let (btx, rx) = tokio::sync::watch::channel(Message::text("will never be seen")); 
    let tick_tx = tx.clone();
    runtime.spawn(async move{
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(30));
        loop{
            interval.tick().await;
            println!("tick");
            match tick_tx.send(Ok(Message::text("TICK|"))){
               Err(_) => break,
               _ => continue, 
            };
        }
    });
    while let Some(result) = user_ws_rx.next().await{
        let msg = result.unwrap();
        btx.send(msg.clone()).unwrap();
        let outcome = match got_message(&user_id, msg, &pool.get().await.unwrap()).await{
            Ok(outcome) => outcome,
            _ => continue,
        };
        if let Outcome::Sell(value) = outcome{
            match tx.send(Ok(Message::text(format!["SOLD|{}", value]))){
                Err(_)=> break,
                _ => continue,
            };
        }
    }
    user_disconnected(&user_id, &users).await;
}
async fn user_disconnected(user_id: &Uuid, users: &Users){
    println!("user disconnected");
}
async fn setup(msg: warp::ws::Message, client: &tokio_postgres::Client, tx: mpsc::UnboundedSender<Result<Message, warp::Error>>) -> Result<Uuid, Box<dyn std::error::Error>>{
    let config: argon2::Config = argon2::Config::default();

    let fields: Result<&str, ()> = msg.to_str();
    let fields: Vec<&str> = match fields{
        Ok(msg_str) => msg_str.split("|").collect(),
        Err(_e) => return Err(SetupError.into()),
    };
    println!("{:?}", fields);
    let packet = match fields[0] {
        "LOGIN" => PacketType::Login(String::from(fields[1]), String::from(fields[2])),
        "REGISTER" => PacketType::Register(String::from(fields[1]), String::from(fields[2])),
        _ => PacketType::Bad,
    };
    let user_lookup = client.prepare("SELECT * from users WHERE username=$1;").await?;
    if let PacketType::Login(user, pass) = packet {
        let user_info = match client.query_one(&user_lookup, &[&user]).await{
            Ok(row) => UserRow{username: row.get("username"), uuid: row.get("uuid"), hash: row.get("hash"), salt: row.get("salt"), darkmode: row.get("darkmode")},
            _ => {tx.send(Ok(Message::text("NOUSER|")))?; println!("no such user"); return Err(SetupError.into())}
        };
        if !argon2::verify_raw(&pass.as_bytes(), &user_info.salt, &user_info.hash, &config)?{
            tx.send(Ok(Message::text("BADPASS|")))?;
            return Err(SetupError.into());
        };
        let user_id = Uuid::parse_str(&user_info.uuid)?;
        tx.send(Ok(Message::text(format!("DARKMODE|{}", user_info.darkmode))))?;
        return Ok(user_id);
    }

    if let PacketType::Register(user, pass) = packet {
        println!("registering {}", user);
        let user_check = client.query(&user_lookup, &[&user]).await?;
        if let false = user_check.is_empty(){
            tx.send(Ok(Message::text("USEREXISTS|")))?; 
            return Err(SetupError.into());
        };
        let mut salt = vec![0u8; 16];
        getrandom::getrandom(&mut salt)?;
        let p_hash = argon2::hash_raw(&pass.as_bytes(), &salt, &config)?;
        let user_id = Uuid::new_v4();
        let user_insert =match  client.prepare(
            "INSERT INTO users (username, uuid, hash, salt, darkmode) VALUES($1,$2,$3,$4,$5);"
        ).await {
            Ok(v) => v,
            Err(e) => {println!("{}", e); return Err(e.into());}
        };
        if let Err(e) = client.execute(
            &user_insert, 
            &[&user, &user_id.to_simple().to_string(), &p_hash, &salt, &false]
        ).await{ println!("{}", e);};
        println!("{}", user_id);
        tx.send(Ok(Message::text("DARKMODE|false")))?;
        return Ok(user_id);
    }
    let user_id = Uuid::new_v4();
    Ok(user_id)
}
async fn got_message(user_id: &Uuid, msg: warp::ws::Message, client: &tokio_postgres::Client) -> Result<Outcome, Box<dyn std::error::Error>>{
    let fields: Result<&str, ()> = msg.to_str();
    let fields: Vec<&str> = match fields{
        Ok(msg_str) => msg_str.split("|").collect(),
        Err(_e) => return Err(SetupError.into()),
    };

    let packet = match fields[0] {
        "SELL" => PacketType::Sell(fields[1..].iter().map(|v| {
            let s: Vec<&str> = v.split("=").collect(); 
            Stack{name: String::from(s[0]), number: match s[1].parse::<i32>(){Ok(num)=>num, _=>0}}})
            .collect()),
        "CREATEGAME" => PacketType::CreateGame(),
        "DARKMODE" => PacketType::DarkMode(match fields[1]{"true" => true, _ => false}),
        _ => return Err(MessageError.into()),
    };
    if let PacketType::Sell(items) = &packet{
        let query = client.prepare("SELECT * from items;").await?;
        let sold = client.prepare("UPDATE items SET sold = $1 WHERE name=$2;").await?;
        let rows = client.query(&query, &[]).await?;
        let mut prices: HashMap<String, (i32, i32)>= HashMap::new();
        let mut value: i32 = 0;
        for row in rows{
            let name: String = row.get("name");
            let price: i32 = row.get("price");
            let sold: i32 = row.get("sold");
            prices.insert(name, (price, sold));
        }
        for item in items{
            if let Some(price) = prices.get(&item.name){
                value = value + price.0 * &item.number;
                client.execute(&sold, &[&(&price.1+&item.number), &item.name]).await?;
            }
        }
        return Ok(Outcome::Sell(value));
    }
    if let PacketType::DarkMode(flag) = &packet{
        let query = client.prepare("UPDATE users SET DarkMode=$1 WHERE uuid=$2").await?;
        client.execute(&query, &[&flag, &user_id.to_simple().to_string()]).await?;
    }
    if let PacketType::CreateGame() = packet{
        return Ok(Outcome::CreateGame(Uuid::new_v4()));
    }
    return Err(MessageError.into());
}