import * as Action from "./Action.js";
import React from "react";
import {Toolbar, ToolbarGroupLeft, ToolbarGroupRight} from "./Toolbar.js";
import {ToggleButton} from "./ToggleButton.js";
import {ModeSwitcher, Mode} from "./ModeSwitcher.js";

export class PrimaryToolbar extends React.PureComponent {
  spawnEditor = () => this.props.dispatch(
    Action.propertySet({ _showEditorOverlay: true })
  );
  doRefresh = () => this.props.dispatch(
    Action.inputPropertySet({})
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
         scope="inspectorPanel.mode"
         requestMode={requestMode}
         {...this.props}
        >
          <Mode id="l">Lua</Mode>
          <Mode id="b">Bytecode</Mode>
          <Mode id="m">Mixed</Mode>
        </ModeSwitcher>
        <ToolbarGroupRight className="pane-toggle">
          <ToggleButton
            isOn    = {layout.tracePaneIsVisible}
            onClick = {this.toggleTracePane}
          ><span className="pane-toggle-icon">&#x258f;</span></ToggleButton>
          <ToggleButton
            isOn    = {this.props.state.showTopPanel}
            onClick = {this.toggleTopPanel}
          ><span className="pane-toggle-icon">&#x2594;</span></ToggleButton>
          <ToggleButton
            isOn    = {layout.detailsPaneIsVisible}
            onClick = {this.toggleDetailsPane}
            label   = {<span className="pane-toggle-icon">&#x2595;</span>}
          ><span className="pane-toggle-icon">&#x2595;</span></ToggleButton>
        </ToolbarGroupRight>
      </Toolbar>
    );
  }
}

function requestMode(state, mode) { return mode || "l"; }
