import * as Action from "./Action.js";
import React from "react";
import {Toolbar, ToolbarGroupLeft, ToolbarGroupRight} from "./Toolbar.js";
import {ToggleButton} from "./ToggleButton.js";
import {ModeSwitcher} from "./ModeSwitcher.js";

const modes = [
  { key:"l", label:"Lua" },
  { key:"b", label:"Bytecode" },
  { key:"m", label:"Mixed" }
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
    Action.propertySet({ showTopPanel: !this.props.state.showTopPanel })
  );
  toggleTracePane = () => this.props.dispatch(
    Action.paneVisibilityToggle("inspectorPanel.paneLayout", "tracePane")
  );
  toggleDetailsPane = () => this.props.dispatch(
    Action.paneVisibilityToggle("inspectorPanel.paneLayout", "detailsPane")
  );
  render() {
    const layout = this.props.state["inspectorPanel.paneLayout"];
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
            isOn    = {layout.tracePaneIsVisible}
            onClick = {this.toggleTracePane}
            label   = {<span className="pane-toggle-icon">&#x258f;</span>}
          />
          <ToggleButton
            isOn    = {this.props.state.showTopPanel}
            onClick = {this.toggleTopPanel}
            label   = {<span className="pane-toggle-icon">&#x2594;</span>}
          />
          <ToggleButton
            isOn    = {layout.detailsPaneIsVisible}
            onClick = {this.toggleDetailsPane}
            label   = {<span className="pane-toggle-icon">&#x2595;</span>}
          />
        </ToolbarGroupRight>
      </Toolbar>
    );
  }
}
