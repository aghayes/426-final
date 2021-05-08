import React from "react";
class Garden extends React.Component{
    constructor(props){
        super(props)
        this.state = {
            size: props.size,
            plants: [],
            update: [],
        }
        this.register = this.register.bind(this);
    }
    register(func){
        let up = this.state.update;
        up.push(func);
        this.setState({update: up});
    }
    componentDidUpdate(){
        console.log("tick" + this.props.tick)
        if(this.props.tick){
            this.state.update.forEach(el=>el());
        }
    }
    componentDidMount(){
        let plants = [];
        for(let i = 1; i<=this.state.size; i++){
            for(let j =1; j<=this.state.size; j++){
                plants.push(<Plant i={i} j={j} tick={this.register} callBack={this.props.callBack}/>);
            }
        }
        this.setState({plants: plants});
    }
    render(){
        return(
            <div className="garden">
                {this.state.plants}
                {this.state.update?"":""}
            </div>
        )
    }   
}
class Plant extends React.Component{
    constructor(props){
        super(props);
        this.state ={
            i: props.i,
            j: props.j,
            growth: 0,
            symbol: "~",
            currentSymbol: "~",
            name: null,
        }
        this.dragOver = this.dragOver.bind(this);
        this.drop = this.drop.bind(this);
        this.tick = this.tick.bind(this);
        this.onClick = this.onClick.bind(this);
    }
    componentDidMount(){
        this.props.tick(this.tick);
    }
    async onClick(e){
        console.log("click");
        if(this.state.growth === 2){
            this.props.callBack(this.state.name, 1, this.state.currentSymbol);
            this.setState({
                name: null,
                symbol: "~",
                currentSymbol: "~",
                growth: 0,
            })
        }
        else{
            await this.tick();
            await this.tick();
        }
    }
    dragOver(e){
        if(e.dataTransfer.types.includes("seed")){
            e.preventDefault();
        }
        e.dataTransfer.dropEffect = "move";
    }
    drop(e){
        let data = e.dataTransfer.getData("text").split("|");
        console.log(data)
        e.preventDefault();
        this.setState({
            name: data[0],
            symbol: data[1],
            currentSymbol: "*",
        });
    }
    async tick(){
        console.log("tick");
        if(this.state.name != null){
            if(this.state.growth != 2){
                if(this.state.growth == 0){
                    this.setState({currentSymbol: "🌱", growth: 1});
                }
                else{
                    this.setState({currentSymbol: this.state.symbol, growth: 2});
                }
            }
        }
    }
    render(){
        return(
            <div className="plant" onClick={this.onClick} onDragOver={this.dragOver} onDrop={this.drop} style={{gridArea: `${this.state.i}/${this.state.j}/${this.state.i+1}/${this.state.j+1}`}}>
                <a>{this.state.currentSymbol}</a>
            </div>
        )
    }
}
export default Garden;