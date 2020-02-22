import {PaneDivider} from "./PaneDivider.js";
import {PrimaryPane, PrimaryToolbar} from "./InspectorPanel_PrimaryPane.js";
import {TracePane, TraceToolbar} from "./InspectorPanel_TracePane.js";
import {DetailsPane, DetailsToolbar} from "./InspectorPanel_DetailsPane.js";
import {CmdButton} from "./ToolbarButton.js";
import {Icon} from "./Icon.js";

import * as Action from "./Action.js";

export function InspectorPanel(props) {
  const layout = props.state["inspectorPanel.paneLayout"];
  return (
    <div className="flex pane-layout h">
      {
        !layout.tracePaneIsVisible ? null :
        <div
         className="pane pane-secondary pane-layout v"
         style={{ width: layout.tracePaneWidth + "px" }}
        >
          <TracePane {...props}/>
        </div>
      }
      <PaneDivider
       type="v" layoutId="inspectorPanel.paneLayout"
       paneId="tracePane" dispatch={props.dispatch}
      />
      <div className="pane flex pane-layout v">
        <PrimaryPane {...props}/>
      </div>
      <PaneDivider
       type="v" layoutId="inspectorPanel.paneLayout"
       paneId="detailsPane" dispatch={props.dispatch}
      />
      {
        !layout.detailsPaneIsVisible ? null :
        <div
         className="pane pane-secondary pane-layout v"
         style={{ width: layout.detailsPaneWidth + "px" }}
        >
          <DetailsPane {...props}/>
        </div>
      }
    </div>
  );
}

export function InspectorToolbar(props) {
  const layout = props.state["inspectorPanel.paneLayout"];
  return (
    <div className="pane-layout h">
      {
        !layout.tracePaneIsVisible ? null :
        <div
         className="toolbar secondary"
         style={{ width: layout.tracePaneWidth + "px" }}
        >
          <TraceToolbar {...props}/>
        </div>
      }
      <div className="toolbar secondary flex">
        <PrimaryToolbar {...props}/>
        <div className="toolbar-group left">
          <TracePaneToggleButton {...props}/>
        </div>
        <div className="toolbar-group right">
          <DetailsPaneToggleButton {...props}/>
        </div>
      </div>
      {
        !layout.detailsPaneIsVisible ? null :
        <div
         className="toolbar secondary"
         style={{ width: layout.detailsPaneWidth + "px" }}
        >
          <DetailsToolbar {...props}/>
        </div>
      }
    </div>
  );
}

class TracePaneToggleButton extends React.PureComponent {
  togglePane = () => this.props.dispatch(
    Action.paneVisibilityToggle("inspectorPanel.paneLayout", "tracePane")
  );
  render() {
    const layout = this.props.state["inspectorPanel.paneLayout"];
    const isVisible = layout.tracePaneIsVisible;
    if (!isVisible && !layout._tracePaneCanShow) return null;
    return (
      <CmdButton onClick={this.togglePane}
       tooltip={ isVisible ? "Hide trace pane" : "Show trace pane" }>
        <Icon id={ isVisible ? "pane-hide-left" : "pane-show-left"}/>
      </CmdButton>
    );
  }
}

class DetailsPaneToggleButton extends React.PureComponent {
  togglePane = () => this.props.dispatch(
    Action.paneVisibilityToggle("inspectorPanel.paneLayout", "detailsPane")
  );
  render () {
    const layout = this.props.state["inspectorPanel.paneLayout"];
    const isVisible = layout.detailsPaneIsVisible;
    if (!isVisible && !layout._detailsPaneCanShow) return null;
    return (
      <CmdButton onClick={this.togglePane}
       tooltip={ isVisible ? "Hide details pane" : "Show details pane" }>
        <Icon id={ isVisible ? "pane-hide-right" : "pane-show-right"}/>
      </CmdButton>
    );
  }
}
