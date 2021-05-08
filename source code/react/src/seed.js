import React from "react"
class Seed extends React.Component{
    constructor(props){
        super(props);
        this.state = {
            name: this.props.name,
            symbol: this.props.symbol,
        }
        this.dragStart = this.dragStart.bind(this);
        this.dragEnd = this.dragEnd.bind(this);
    }
    dragStart(e){
        e.dataTransfer.setData("text", this.state.name +"|"+ this.state.symbol);
        e.dataTransfer.setData("SEED","");
        let dragImg = document.createElement("div");
        dragImg.style.position="absolute";
        dragImg.style.top="-1000px";
        dragImg.innerHTML=this.state.symbol;
        dragImg.id = this.state.name;
        document.body.appendChild(dragImg);
        e.dataTransfer.setDragImage(dragImg, 0, 0);
        e.dataTransfer.effectAllowed = "move";
    }
    dragEnd(e){
        document.getElementById(this.state.name).remove();
    }
    render(){
        return(
            <a draggable="true" className="seed" onDragStart={this.dragStart} onDragEnd={this.dragEnd}>
                {this.state.symbol}
            </a>
        )
    }
}
class SeedBox extends React.Component{
    constructor(props){
        super(props);
    }
    render(){
        return(
            <div className="seedBoxTotal">
                <a>Seeds:</a>
                <div className="seedBox">
                    <Seed name="rice" symbol="🌾"/>
                    <Seed name="broccoli" symbol="🥦"/>
                    <Seed name="mushroom" symbol="🍄"/>
                    <Seed name="eggplant" symbol="🍆"/>
                    <Seed name="pepper" symbol="🌶️"/>
                    <Seed name="herbs" symbol="🌿"/>
                    <Seed name="celery" symbol="🥬"/>
                    <Seed name="tulip" symbol="🌷"/>
                    <Seed name="sunflower" symbol="🌻"/>
                    <Seed name="rose" symbol="🌹"/>
                </div>
            </div>
        )
    }
}
export default SeedBox;