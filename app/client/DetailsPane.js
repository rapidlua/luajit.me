import React from "react";
import {Placeholder} from "./Placeholder.js";
import {ProtoDetailsPane} from "./ProtoDetailsPane.js";
import {Toolbar} from "./Toolbar.js";
import {TraceDetailsPane} from "./TraceDetailsPane.js";

export function DetailsPane(props) {
  const selection = props.state.selection;
  if (selection) {
    const index = +selection.substr(1);
    switch (selection.substr(0,1)) {
    case "P":
      if (props.state.response.prototypes[index])
        return <ProtoDetailsPane {...props}/>;
      break;
    case "T":
      if (props.state.response.traces[index])
        return <TraceDetailsPane {...props}/>;
      break;
    }
  }
  return (
    <React.Fragment>
      <Toolbar {...props}/>
      <Placeholder>No Selection</Placeholder>
    </React.Fragment>
  );
}
