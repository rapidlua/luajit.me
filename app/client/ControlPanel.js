import {PaneDivider} from "./PaneDivider.js";
import {InspectorToolbar} from "./InspectorPanel.js";
import {CmdButton} from "./ToolbarButton.js";
import "./Toolbar.css";
import "./PaneLayout.css";
import "./ControlPanel.css";

export function ControlPanel(props) {
  const layout = props.state["root.paneLayout"];
  console.log(layout);
  return (
    <div className="control-panel pane-layout v">
      { !layout.inlineEditorIsVisible ? null :
        <div
         className="inline-editor-pane"
         style={{ height: layout.inlineEditorHeight + "px"}}
        />
      }
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
