import React from "react";
import Slot from "./dropslot";
class Cart extends React.Component{
    constructor(props){
        super(props);
        this.state={
            name: null,
            number: null,
            symbol: null,
        }
        this.getData = this.getData.bind(this);
        this.onClick = this.onClick.bind(this);
    }
    componentDidUpdate(){
        if(this.props.update && this.state.name!==null){
            this.props.sendMessage("SELL|" + this.state.name +"="+this.state.number);
            this.setState({name:null, number:null, symbol:null});
        }
    }
    getData(data){
        this.setState({
            name: data[0],
            number: parseInt(data[1]),
            symbol: data[2],
        });
    }
    onClick(){
        this.props.giveItem(this.state.name, this.state.number, this.state.symbol);
        this.setState({name:null, number:null, symbol:null});
    }
    render(){
        return(
            <div className={"cart "+this.props.class}>
                {this.props.update?"":""}
                <Slot onClick={this.onClick} giveData={this.getData} classList="cartSlot" number={this.state.number} symbol={this.state.symbol}/>
                <label>{this.state.number !== null? this.state.number: String.fromCharCode(160)}</label>
            </div>
        )
    }
}

export {Cart}