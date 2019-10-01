import * as Action from "./Action.js";
import React from "react";
import "./Toolbar.css";

export class ToolbarHoverTrigger extends React.Component {
  hover = (e) => this.props.dispatch(
    Action.propertySet({ _toolbarHover: this.isActive = true })
  )
  unhover = (e) => this.props.dispatch(
    Action.propertySet({ _toolbarHover: this.isActive = false })
  )
  componentWillUnmount() {
    if (this.isActive) this.unhover();
  }
  render() {
    return (
      <div
        className={this.props.className || null}
        onMouseEnter={this.hover} onMouseLeave={this.unhover}
      >{
        this.props.children || null
      }</div> 
    );
  }
}

export function Toolbar(props) {
  return (
    <ToolbarHoverTrigger
     dispatch={props.dispatch}
     className={
       "toolbar" + (props.state._toolbarHover ? " hover" : "")
     }
    >{props.children || null}</ToolbarHoverTrigger>
  );
}

export function ToolbarGroupLeft(props) {
  return (
    <div
     className={"toolbar-group left " + (props.className || "")}
    >{props.children}</div>
  );
}

export function ToolbarGroupRight(props) {
  return (
    <div
     className={"toolbar-group right " + (props.className || "")}
    >{props.children}</div>
  );
}
