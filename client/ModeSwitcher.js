import React from "react";
import {ToggleButton} from "./ToolbarButton.js";
import * as Action from "./Action.js";
import "./Toolbar.css";

const ModeSwitcherContext = React.createContext({});

export function ModeSwitcher(props) {
  const { children, ...contextProps } = props;
  return (
    <div className="toolbar-group">
      <ModeSwitcherContext.Provider value={contextProps}>{
        children
      }</ModeSwitcherContext.Provider>
    </div>
  );
}

export class Mode extends React.Component {
  static contextType = ModeSwitcherContext;
  handleClick = (e) => {
    const { dispatch, scope } = this.context;
    dispatch(Action.propertySet({ [scope]: this.props.id }));
  }
  render() {
    const { state, scope, requestMode } = this.context;
    let currentMode = state && state[scope];
    if (requestMode) {
      if (requestMode(state, this.props.id) !== this.props.id)
        return null;
      currentMode = requestMode(state, currentMode);
    }
    return (
      <ToggleButton
       className="toggle-alt"
       isOn={currentMode === this.props.id}
       onClick={this.handleClick}
      >{this.props.children}</ToggleButton>
    );
  }
}
