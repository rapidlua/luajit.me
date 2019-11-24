import {PaneDivider} from "./PaneDivider.js";
import {InspectorToolbar} from "./InspectorPanel.js";
import {CmdButton} from "./ToolbarButton.js";
import "./Toolbar.css";
import "./PaneLayout.css";
import "./ControlPanel.css";

export function ControlPanel(props) {
	return (
		<div className="control-panel pane-layout v">
      <div className="toolbar primary">
				<div className="toolbar-group left">
					<CmdButton>Edit</CmdButton>
					<CmdButton>Share</CmdButton>
					<CmdButton>About</CmdButton>
				</div>
			</div>
			<InspectorToolbar {...props}/>
			<PaneDivider type="h"/>
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
