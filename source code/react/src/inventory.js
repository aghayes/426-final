import React from "react";

class Inventory extends React.Component{
    constructor(props){
        super(props);
        this.state ={
            items: []
        }
        this.dragStart = this.dragStart.bind(this);
        this.dragEnd = this.dragEnd.bind(this);
    }
    componentDidMount(){
        this.setState({items: this.props.items});
    }
    componentDidUpdate(prevProps){
        if(this.props.items !== prevProps.items){
            this.setState({items:this.props.items});
        }
    }
    dragStart(e){
        e.dataTransfer.setData("text", e.target.dataset.name+"|"+e.target.dataset.number+"|"+e.target.dataset.symbol);
        e.dataTransfer.setData("item", "");
        let dragImg = document.createElement("div");
        dragImg.style.position="absolute";
        dragImg.style.top="-1000px";
        dragImg.innerHTML=e.target.dataset.symbol;
        dragImg.id = e.target.dataset.name;
        document.body.appendChild(dragImg);
        e.dataTransfer.setDragImage(dragImg, 0, 0);
        e.dataTransfer.dropEffect = "move";
    }
    dragEnd(name, e){
        document.getElementById(name).remove();
        console.log(e);
        if(e.dataTransfer.dropEffect == "move"){
            this.props.removeItem(name);
        }
    }
    render(){
        return(
            <div className="inventoryTotal">
                <a>Inventory:</a>
                <div className="inventory">
                    {this.state.items.map(el => <Item dragEnd={this.dragEnd} dragStart={this.dragStart} name={el[0]} number={el[1]} symbol={el[2]}/>)}
                </div>
            </div>
        )
    }
}
class Item extends React.Component{
    constructor(props){
        super(props);
        this.state ={
            dragStart: this.props.dragStart,
            dragEnd: this.props.dragEnd,
        }
    }
    render(){
        return(
            <a draggable="true"
            onDragStart={this.state.dragStart} 
            onDragEnd={(event)=>{this.state.dragEnd(this.props.name, event)}}
            data-name={this.props.name} 
            data-number={this.props.number.toString()} 
            data-symbol={this.props.symbol}>{this.props.symbol}: {this.props.number}</a>
        )
    }
}

export default Inventory;