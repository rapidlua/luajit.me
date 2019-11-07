import React from "react";
import {Placeholder} from "./Placeholder.js";
import {ProtoDetailsPane} from "./InspectorPanel_ProtoDetailsPane.js";
import {Toolbar} from "./Toolbar.js";
import {TraceDetailsPane} from "./InspectorPanel_TraceDetailsPane.js";
import {getSelection, getObjects} from "./processing.js";

export function DetailsPane(props) {
  const selection = getObjects(props.state)[getSelection(props.state)];
  if (selection) {
    switch (selection.type) {
    case "proto":
      return <ProtoDetailsPane {...props}/>;
    case "trace":
    case "trace.abort":
      return <TraceDetailsPane {...props}/>;
    }
  }
  return (
    <React.Fragment>
      <Toolbar {...props}/>
      <Placeholder>No Selection</Placeholder>
    </React.Fragment>
  );
}
