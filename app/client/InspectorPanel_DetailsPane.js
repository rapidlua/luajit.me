import React from "react";
import {Placeholder} from "./Placeholder.js";
import {ProtoDetailsPane} from "./InspectorPanel_ProtoDetailsPane.js";
import {ProtoDetailsToolbar} from "./InspectorPanel_ProtoDetailsPane.js";
import {TraceDetailsPane} from "./InspectorPanel_TraceDetailsPane.js";
import {TraceDetailsToolbar} from "./InspectorPanel_TraceDetailsPane.js";
import {getSelectedObject} from "./processing.js";

export function DetailsPane(props) {
  const selection = getSelectedObject(props.state);
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
    <Placeholder>No Selection</Placeholder>
  );
}

export function DetailsToolbar(props) {
  const selection = getSelectedObject(props.state);
  if (selection) {
    switch (selection.type) {
    case "proto":
      return <ProtoDetailsToolbar {...props}/>;
    case "trace":
    case "trace.abort":
      return <TraceDetailsToolbar {...props}/>;
    }
  }
  return null;
}
