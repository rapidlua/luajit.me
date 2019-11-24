import {PaneDivider} from "./PaneDivider.js";
import {PrimaryPane, PrimaryToolbar} from "./InspectorPanel_PrimaryPane.js";
import {TracePane, TraceToolbar} from "./InspectorPanel_TracePane.js";
import {DetailsPane, DetailsToolbar} from "./InspectorPanel_DetailsPane.js";

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
