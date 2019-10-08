import React from "react";
import {PaneDivider} from "./PaneDivider.js";
import {PrimaryPane} from "./PrimaryPane.js";
import {TracePane} from "./TracePane.js";
import {DetailsPane} from "./DetailsPane.js";

export function InspectorPanel(props) {
  const layout = props.state["inspectorPanel.paneLayout"];
  return (
    <React.Fragment>
      {
        !layout.tracePaneIsVisible ? null :
        <div className="secondary-pane" style={{ width: layout.tracePaneWidth + "px" }}>
          <TracePane {...props}/>
        </div>
      }
      <PaneDivider
        type="v" layoutId="inspectorPanel.paneLayout"
        paneId="tracePane" dispatch={props.dispatch}
      />
      <div className="primary-pane">
        <PrimaryPane {...props}/>
      </div>
      <PaneDivider
        type="v" layoutId="inspectorPanel.paneLayout"
        paneId="detailsPane" dispatch={props.dispatch}
      />
      {
        !layout.detailsPaneIsVisible ? null :
        <div className="secondary-pane" style={{ width: layout.detailsPaneWidth + "px" }}>
          <DetailsPane {...props}/>
        </div>
      }
    </React.Fragment>
  );
}
