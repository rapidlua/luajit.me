import React from "react";
import {PaneDivider} from "./PaneDivider.js";
import {InspectorToolbar} from "./InspectorPanel.js";
import {CmdButton} from "./ToolbarButton.js";
import "./Toolbar.css";
import "./PaneLayout.css";
import "./ControlPanel.css";

export class ControlPanel extends React.PureComponent {
  state = { hover: false }
  hover = () => this.setState({ hover: true });
  unhover = () => this.setState({ hover: false });
  render() {
    const layout = this.props.state["root.paneLayout"];
    const pmode = this.props.state["root.presentationMode"];
    const style = {};
    if (pmode)
      style.height = (layout.inlineEditorIsVisible
        ? layout.inlineEditorHeight : 0) + 16 + "px";
    return (
      <div
       className="control-panel" style={style}
       onMouseEnter={this.hover} onMouseLeave={this.unhover}
      >
        { !layout.inlineEditorIsVisible ? null :
          <div
           className="inline-editor-pane"
           style={{ height: layout.inlineEditorHeight + "px"}}
          />
        }
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
          <CmdButton>Share</CmdButton>
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

function _() {
  return (
          !state.showTopPanel ? null :
          <ToolbarHoverTrigger className="pane-top"
           dispatch={this.props.dispatch}
          >
            <textarea
              rows="5" onChange={this.handleTextChange}
              value={state._input.text}
            />
          </ToolbarHoverTrigger>
  );
}
