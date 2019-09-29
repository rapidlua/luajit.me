import * as Action from "./Action.js";
import React from "react";
import "./Toolbar.css";

export class Toolbar extends React.Component {
  hover = (e) => this.props.dispatch(
    Action.propertySet({ _toolbarHover: true })
  )
  unhover = (e) => this.props.dispatch(
    Action.propertySet({ _toolbarHover: false })
  )
  render() {
    return (
      <div
        className={
          "toolbar" + (this.props.state._toolbarHover ? " toolbar-hover" : "")
        }
        onMouseEnter={this.hover} onMouseLeave={this.unhover}
      >{
        this.props.children || null
      }</div> 
    );
  }
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
