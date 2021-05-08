import React from "react";
class Slot extends React.Component{
    constructor(props){
        super(props);
        this.state={
            classList: this.props.classList,
            has: false,
        };
        this.dragOver = this.dragOver.bind(this);
        this.drop = this.drop.bind(this);
        this.onClick = this.onClick.bind(this);
    }
    componentDidUpdate(){
        if(this.props.name === null){
            this.setState({has: false})
        }
    }
    onClick(e){
        this.props.onClick();
        this.setState({has: false});    
    }
    dragOver(e){
        if(e.dataTransfer.types.includes("item") && this.state.has==false){
            e.preventDefault();
        }
        e.dataTransfer.dropEffect = "move";
    }
    drop(e){
        let data = e.dataTransfer.getData("text").split("|");
        e.preventDefault();
        this.props.giveData(data);
        this.setState({has: true});
    }
    render(){
        return(
            <div onClick={this.onClick} className={"slotContainer " + this.state.classList} onDragOver={this.dragOver} onDrop={this.drop}>
                <a>{this.props.symbol !== null? this.props.symbol: ""}</a>
            </div>
        )
    }
}
export default Slot;