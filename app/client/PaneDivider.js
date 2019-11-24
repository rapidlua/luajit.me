import * as Action from "./Action.js";
import React from "react";

import "./PaneDivider.css";

export class PaneDivider extends React.Component {
  state = {};
  componentWillUnmount() {
    window.removeEventListener("mouseup", this.handleMouseUp);
    window.removeEventListener("mousemove", this.handleMouseMove);
  }
  handleMouseDown = (e) => {
    e.preventDefault();
    const myRect = e.target.getBoundingClientRect();
    const myHostRect = e.target.parentNode.getBoundingClientRect();
    switch (this.props.type) {
    case "v":
      this.pivot = (this.props.paneSize === undefined ?
        myRect.left - myHostRect.left + myRect.width/2 : this.props.paneSize
      ) - e.clientX;
      break;
    default:
      this.pivot = (this.props.paneSize === undefined ?
        myRect.top - myHostRect.top + myRect.height/2 : this.props.paneSize
      ) - e.clientY;
      break;
    }
    this.setState({resizing: true});
    window.addEventListener("mouseup", this.handleMouseUp);
    window.addEventListener("mousemove", this.handleMouseMove);
  }
  handleMouseMove = (e) => {
    this.dispatchPaneResizeAction(e);
  }
  handleMouseUp = (e) => {
    this.setState({resizing: false});
    window.removeEventListener("mouseup", this.handleMouseUp);
    window.removeEventListener("mousemove", this.handleMouseMove);
    this.dispatchPaneResizeAction(e, true);
  }
  dispatchPaneResizeAction(e, commit) {
    const props = this.props;
    props.dispatch(Action.paneResize(
      props.layoutId,
      props.paneId,
      this.pivot + (props.type === "v" ? e.clientX : e.clientY),
      commit
    ));
  }
  shouldComponentUpdate(nextProps, nextState) {
    return this.props.type !== nextProps.type
      || this.state.resizing !== nextState.resizing;
  }
  render() {
    return (
      <div
       className={"pane-divider " + this.props.type
                  + (this.state.resizing ? " active" : "")}
       onMouseDown={this.handleMouseDown}
      />
    );
  }
}
