// this page stores refs to canvas history, and sets up all the components for the drawing page
//todo lol

import React from 'react';
import {instanceOf} from 'prop-types';
import Canvas from './Canvas';
import Colorpicker from './Colorpicker';
import Button from '../Button';
import LineWidthPicker from './LineWidthPicker';

import { ReactComponent as CurrentColorIndicator } from '../../data/assets/currentColorScribble.svg';
import Switch from '../Switch';
import { randomNumber } from '../../utilities/util';
import { nanoid } from 'nanoid';
import {config} from '../../utilities/constants.js';
import { Cookies, withCookies } from 'react-cookie/lib';

class DrawingPage extends React.Component {
    static propTypes = {
        cookies: instanceOf(Cookies).isRequired
    };

    constructor(props) {
        super(props);
        const {cookies} = props;
        
        this.state = {
            creatureId: '',
            colors: [
                {color: "#eb2727"}, //red
                {color: "#333333"}, //black
                {color: "#f89c14"}, //orange
                {color: "#f1de2d"}, //yellow
                {color: "#82de57"}, //lightgreen
                {color: "#51ad42"}, //darkgreen
                {color: "#84b5fe"}, //lightblue
                {color: "#1f32de"}, //darkblue
                {color: "#bb4bf0"}, //purple
            ],
            lineWidths: [
                {
                    size: 'Small',
                    width: '3'
                },
                {
                    size: 'Medium',
                    width: '7'
                },
                { size: 'Large',
                width: '12'}
            ],
            currentColor: "#333333",
            currentWidth: "7",
            lineHistory: [],
            //true means we are drawing
            status: true,
            finished: false,
        }
        this.removeLastLine = this.removeLastLine.bind(this);
        this.handleToolChange = this.handleToolChange.bind(this);

        this.indicatorStyle = {
            backgroundColor: this.state.currentColor,
        }

        this.undoTriggered = false;
        this.doneTriggered = false;
        this.dataURL = '';
        this.bodyPart = '';
        this.borderColor = '';
        
        cookies.getAll();
    }

    componentDidMount() {
        this.setBodyPart();
        this.setId();
        this.setBorderColor();
    }

    setBodyPart() {
        let part = randomNumber(3);
        switch (part) {
            case 0:
                this.bodyPart = "Head";
                break;
            case 1: 
                this.bodyPart = "Body";
                break;
            case 2:
                this.bodyPart = "Legs";
                break;
            default:
                this.bodyPart = "Head";
                break;
        }
    }

    setBorderColor() {
        let color = this.state.colors[randomNumber(this.state.colors.length)].color;

        this.borderColor = color;
    }

    setId() {
        const {cookies} = this.props;
        //make an id - 5 for a little bit more security
        const id = nanoid(5);
        this.setState({
            creatureId: id
        });
        //set the cookie - we use this to reference in the combination pg
        
        cookies.set('creatureId', id, {path: '/'});
    }

    handleHistoryCallback = (childData) => {
        this.setState({
            lineHistory: [...this.state.lineHistory, childData]
        });
        //this is the history of line movement
        //all the moves theyve made!
    }

    changeColor(i) {
        this.setState({
            currentColor: i
        });
    }

    changeStatus(i) {
        //change the status of painting or erasing in here
        this.setState({
            status: i
        });
    }

    handleDone = (childData) => 
    {
        //handle imagedata in here
        this.dataURL = childData;

        //start building save object
        const dataObj = {
            id: this.state.creatureId,
            type: this.bodyPart,
            data: {
                imageData: this.dataURL,
                borderColor: this.borderColor
            },
            createdOn: Date.now()
        };

        let response = fetch(config.url.API_URL + '/savePart', {
            method: 'POST',
            body: JSON.stringify(dataObj),
            headers: {
                'Content-type':'application/json'
            }
        });
        console.log(response);
    }

    initiateDone() {
        this.doneTriggered = !this.doneTriggered;
        
        this.setState({
            finished: this.doneTriggered,
        })
    }

    handleToolChange(e) {
        console.log("tool changed");
        //change the tool
        this.changeTool(!this.state.status);
    }

    changeTool(i) {
        this.setState({
            status: i
        })
    }

    changeWidth(i) {
        this.setState({
            currentWidth: i
        });
    }

    renderColorPicker() {
        //loop thru object
        let pickers = [];
        this.state.colors.map((i) => {
            pickers.push(
                <Colorpicker key={i.color.toString()} value={i.color} onClick={() => this.changeColor(i.color)} />
            )
        });
           
        return pickers;
    }

    renderUndoButton() {
        return (
            <Button onClick={() => this.removeLastLine()} buttonText={"Undo"} />
        )
    }
    renderEraseButton() {
        return (
            <Button value = {this.eraseTriggered} onClick={() => this.handleEraser()} style={{background: this.bColor,color: this.textColor}}buttonText={"Erase"} />
        )
    }

    renderDoneButton(){
        return(
            <Button onClick={() => this.initiateDone()} buttonText={"Done"} />
        )
    }

    renderSmoothButton() {
        return (
            <Button onClick={() => this.toggleSmooth()} buttonText={"Smooth"} />
        )
    }

    renderLineWidthPicker() {
        //loop thru object
        let widths = [];
        this.state.lineWidths.map((i) => {
            widths.push(
                <LineWidthPicker key={i.width.toString()} value={i.width} onClick={() => this.changeWidth(i.width)} buttonText={i.size}/>
            )
        });
        return widths;
    }

    removeLastLine() {
        this.undoTriggered = !this.undoTriggered;

        let tempArr = this.state.lineHistory;

        tempArr.pop();

        this.setState({
            lineHistory: tempArr,
        })
    }

    toggleSmooth() {
        this.props.smooth = !this.props.smooth;
        console.log(this.props.smooth);
    }

    render() {
        return(
            <div className="drawingPage">
                <div className="linewidthpickerWrapper">
                    <h2>Brush Stroke</h2>
                    {this.renderLineWidthPicker()}
                </div>

                <div className="colorpickerWrapper">
                    <CurrentColorIndicator fill={this.state.currentColor}/>
                    {this.renderColorPicker()}
                </div>

                <Switch checked={this.state.status} onChange={
                    this.handleToolChange}></Switch>

                <div className="sliderDiv">
                    <label className="switchTool" >
                        <input type="checkbox"
                               checked={this.state.status}
                               onChange={this.handleToolChange} ></input>
                        <span className="slider round"></span>
                </label>
                </div>

                <Canvas strokeColor={this.state.currentColor}
                    historyCallback={this.handleHistoryCallback}
                    eraseTrigger={this.eraseTriggered}
                    undoTrigger={this.undoTriggered}
                    paintTrigger={this.paintTriggered}

                    doneTrigger={this.doneTriggered}
                    doneCallback={this.handleDone}

                    lineHistory={this.state.lineHistory}
                    lineWidth={this.state.currentWidth}
                    status={this.state.status}>
                </Canvas>

                <p>{this.bodyPart}</p>

                {this.renderUndoButton()}

                {this.renderDoneButton()}

            </div>
        );
    }

}

export default withCookies(DrawingPage);