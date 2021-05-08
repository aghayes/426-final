use uuid::Uuid;
use warp::ws::{Message, WebSocket};
use tokio::sync::{mpsc, RwLock, watch};

pub enum PacketType {
    Login(String, String),
    Register(String, String),
    Sell(Vec<Stack>),
    CreateGame(),
    DarkMode(bool),
    Bad,

}
#[derive(Clone)]
pub enum Outcome{
    Sell(i32),
    CreateGame(Uuid),
}
pub struct User{
    pub tx: mpsc::UnboundedSender<Result<Message, warp::Error>>,
    pub rx: watch::Receiver<Message>
}
pub struct Stack{
    pub name: String,
    pub number: i32
}
pub struct UserRow{
    pub username: String,
    pub uuid: String,
    pub hash: Vec<u8>,
    pub salt: Vec<u8>,
    pub darkmode: bool
}
#[derive(Debug, Clone)]
pub struct SetupError;
impl std::fmt::Display for SetupError{
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result{
        write!(f, "bad setup")
    }
}
impl std::error::Error for SetupError{}
#[derive(Debug, Clone)]
pub struct MessageError;
impl std::fmt::Display for MessageError{
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result{
        write!(f, "unexpected message")
    }
}
impl std::error::Error for MessageError{}