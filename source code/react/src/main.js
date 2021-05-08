import React from "react";
import Garden from "./garden";
import Inventory from "./inventory";
import Login from "./login";
import SeedBox from "./seed";
import {Cart} from "./buildings"

class Main extends React.Component{
    constructor(props){
        super(props);
        this.state ={
            url: props.url,
            ws: null,
            msg: "",
            loginPrompt: "",
            login: "loggedout",
            items: [],
            connected: false,
            darkmode: false,
            money: 0,
            update: false,
            days: 0,
        };
        this.onmessage = this.onmessage.bind(this);
        this.onopen = this.onopen.bind(this);
        this.sendMessage = this.sendMessage.bind(this);
        this.setDarkmode = this.setDarkmode.bind(this);
        this.toggleDarkmode = this.toggleDarkmode.bind(this);
        this.removeItem = this.removeItem.bind(this);
        this.addToInventory = this.addToInventory.bind(this);
        this.addMoney = this.addMoney.bind(this);
        this.update = this.update.bind(this);
    }
    onopen(){
        this.setState({connected: true});
    }
    componentDidMount(){
        let ws = new WebSocket(this.state.url);
        ws.onmessage = this.onmessage;
        ws.onopen = this.onopen;
        ws.onclose = (e)=>{this.setState({msg:e.code})};
        this.setState({ws: ws});
    }
    componentWillUnmount(){
        console.log("closing");
        this.state.ws.close();
    }
    onmessage(msg){
        console.log(msg.data);
        this.setState({msg: msg.data});
        let fields = msg.data.split("|");
        switch (fields[0]){
            default:
                break;
            case "USEREXISTS":
                this.setState({loginPrompt: "Username already in use"});
                break;
            case "NOUSER":
                this.setState({loginPrompt: "No user with that name"});
                break;
            case "BADPASS":
                this.setState({loginPrompt: "Incorrect password"});
                break;
            case "LOGIN":
                this.toggleLogin();
                break;
            case "DARKMODE":
                this.setDarkmode(fields[1]);
                break;
            case "SOLD":
                this.addMoney(parseInt(fields[1]));
                break;
            case "TICK":
                this.update();
                break;
        }

    }
    update(){
        this.setState( {update: true, days: this.state.days+1}, ()=>{this.setState({update: false})});
        console.log(this.state.days);
    }
    sendMessage(msg){
        this.state.ws.send(msg);
    }
    toggleDarkmode(event){
        this.setState({darkmode: !this.state.darkmode})
        document.querySelectorAll("*").forEach(el=>el.classList.toggle("darkmode", this.state.darkmode));
        this.state.ws.send(`DARKMODE|${this.state.darkmode.toString()}`);
    }
    setDarkmode(str){
        switch (str){
            default:
                break;
            case "false":
                this.setState({darkmode: false});
                break;
            case "true":
                this.setState({darkmode: true});
        };
        document.querySelectorAll("*").forEach(el=>el.classList.toggle("darkmode", this.state.darkmode));
    }
    toggleLogin(){
        this.setState({login: this.state.login == "loggedout"?"loggedin":"loggedout"});
    }
    addMoney(value){
        this.setState({money: this.state.money+value})
    }
    addToInventory(name, number, symbol){
        let flag = false;
        let items = this.state.items;
        items.forEach((element)=>{
            if(element[0]===name){
                element[1] = parseInt(element[1]) +number;
                flag = true;
            }
        })
        if(!flag){
            items.push([name, 1, symbol]);
        }
        this.setState({items: items});
    }
    removeItem(name, event){
        console.log(this.state.items.filter((el)=>name!==el[0]))
        this.setState({items: this.state.items.filter((el)=>name!==el[0])});
    }
    render(){
        if(this.state.connected){
            return(
                <div className="main">
                    <div className="header">
                        <h3 className="days">Day: {this.state.days%6}</h3>
                        <h3 className="money">${this.state.money}</h3>
                        <div className="buttonGroup" id="headerGroup">
                            <button className="button left" onCLick={()=>{this.toggleLogin(); this.state.ws.close(); window.location.reload()}}>logout</button>
                            <button className="button right dToggle" onClick={this.toggleDarkmode}>darkmode</button>
                        </div>
                    </div>
                    <div className={`login ${this.state.login}`}>
                        <Login sendMessage={this.sendMessage}/>
                    </div>
                    <div className="board">
                        <label className="cartLabel">Market:</label>
                        <div className="carts">
                            <Cart update={this.state.update} giveItem={this.addToInventory} class="one" sendMessage={this.sendMessage}/>
                            <Cart update={this.state.update} giveItem={this.addToInventory} class="two" sendMessage={this.sendMessage}/>
                            <Cart update={this.state.update} giveItem={this.addToInventory} class="three" sendMessage={this.sendMessage}/>
                            <Cart update={this.state.update} giveItem={this.addToInventory} class="four" sendMessage={this.sendMessage}/>
                        </div>
                        <Garden tick={this.state.update} size={8} callBack={this.addToInventory}/>
                    </div>
                    <Inventory items={this.state.items} removeItem={this.removeItem}/>
                    <SeedBox/>
                </div>
            )
        }
        else{
            return(
                <div>
                    <a>Connecting...</a>
                </div>
            )
        }
    }
}

export default Main