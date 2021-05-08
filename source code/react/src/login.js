import React from "react";

class Login extends React.Component{
    constructor(props){
        super(props);
        this.state = {
            user: "",
            pass: "",
            sendMessage: props.sendMessage,
        };
        this.userChange = this.userChange.bind(this);
        this.passChange = this.passChange.bind(this);
        this.login = this.login.bind(this);
        this.register = this.register.bind(this);
    }
    userChange(event){
        this.setState({user: event.target.value});
    }
    passChange(event){
        this.setState({pass: event.target.value});
    }
    login(event){
        event.preventDefault();
        this.state.sendMessage(`LOGIN|${this.state.user}|${this.state.pass}`);
    }
    register(event){
        event.preventDefault();
        this.state.sendMessage(`REGISTER|${this.state.user}|${this.state.pass}`);
    }
    render(){
        return(
            <div>
                <form>
                    <label>Username:</label><br/>
                    <input type="text" id="usr" value={this.state.user} onChange={this.userChange}/><br/>
                    <label>Password:</label><br/>
                    <input type="password" id="pwd" value={this.state.pass} onChange={this.passChange}/><br/>
                    <div className="buttonGroup" id="loginGroup">
                        <button className="button left" onClick={this.login}>Login</button>
                        <button className="button right" onClick={this.register}>Register</button>
                    </div>
                    <p>{this.props.loginPrompt}</p>
                </form>
            </div>   
        )
    }

}
export default Login;