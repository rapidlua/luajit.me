import * as Action from "./Action.js";
import React from "react";
import {Toolbar, ToolbarGroupLeft, ToolbarGroupRight} from "./Toolbar.js";
import {ToggleButton} from "./ToggleButton.js";
import {ModeSwitcher} from "./ModeSwitcher.js";

const modes = [
  {key:"lua",   label:"Lua"},
  {key:"luabc", label:"Bytecode"},
  {key:"mixed", label:"Mixed"}
];

export class PrimaryToolbar extends React.PureComponent {
  spawnEditor = () => this.props.dispatch(
    Action.propertySet({ _showEditorOverlay: true })
  );
  doRefresh = () => this.props.dispatch(
    Action.inputPropertySet({})
  );
  setMode = (_, mode) => this.props.dispatch(
    Action.propertySet({ mode })
  );
  toggleTopPanel = () => this.props.dispatch(
    Action.propertySet({ showTopPanel: !this.props.state.showTopPane })
  );
  toggleLeftPanel = () => this.props.dispatch(
    Action.propertySet({ showLeftPanel: !this.props.state.showLeftPane })
  );
  toggleRightPanel = () => this.props.dispatch(
    Action.propertySet({ showRightPanel: !this.props.state.showRightPane })
  );
  render() {
    return (
      <Toolbar {...this.props}>
        <ToolbarGroupLeft>
          <span className="toolbar-btn" onClick={this.spawnEditor}>Edit</span>
          <span className="toolbar-btn" onClick={this.doRefresh}>Refresh</span>
        </ToolbarGroupLeft>
        <ModeSwitcher
          currentMode = {this.props.state.mode}
          selectMode = {this.setMode}
          modes={modes}
        />
        <ToolbarGroupRight className="pane-toggle">
          <ToggleButton
            isOn    = {this.props.state.showLeftPanel}
            onClick = {this.toggleLeftPanel}
            label   = {<span className="pane-toggle-icon">&#x258f;</span>}
          />
          <ToggleButton
            isOn    = {this.props.state.showTopPanel}
            onClick = {this.toggleTopPanel}
            label   = {<span className="pane-toggle-icon">&#x2594;</span>}
          />
          <ToggleButton
            isOn    = {this.props.state.showRightPanel}
            onClick = {this.toggleRightPanel}
            label   = {<span className="pane-toggle-icon">&#x2595;</span>}
          />
        </ToolbarGroupRight>
      </Toolbar>
    );
  }
}
