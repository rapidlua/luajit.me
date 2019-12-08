import React from "react";
import {PaneDivider} from "./PaneDivider.js";
import {InspectorToolbar} from "./InspectorPanel.js";
import {CmdButton} from "./ToolbarButton.js";
import {Icon} from "./Icon.js";

import * as Action from "./Action.js";

import "./Toolbar.css";
import "./PaneLayout.css";
import "./ControlPanel.css";

export class ControlPanel extends React.PureComponent {
  state = { hover: false }
  hover = () => this.setState({ hover: true });
  unhover = () => this.setState({ hover: false });
  handleTextChange = (e) => {
    this.props.dispatch(Action.inputPropertySet({
      text: e.target.value, _delay: true
    }));
  }
  render() {
    const pmode = this.props.state["root.presentationMode"];
    const style = {};
    if (pmode) style.height = "16px";
    return (
      <div
       className="control-panel" style={style}
       onMouseEnter={this.hover} onMouseLeave={this.unhover}
      >
        { pmode && !this.state.hover ? null : <ToolbarArea {...this.props}/> }
      </div>
    );
  }
}

function ToolbarArea(props) {
  const layout = props.state["root.paneLayout"];
  return (
    <div className="toolbar-area">
      <div className="toolbar primary">
        <div className="toolbar-group left">
          <CmdButton>Edit</CmdButton>
          <CmdButton><Icon id="share"/> Share</CmdButton>
          <CmdButton>About</CmdButton>
        </div>
      </div>
      <InspectorToolbar {...props}/>
      <PaneDivider
       type="h" layoutId="root.paneLayout"
       paneSize={layout.inlineEditorIsVisible ? layout.inlineEditorHeight : 0}
       paneId="inlineEditor" dispatch={props.dispatch}
      />
    </div>
  );
}
