import memoizeOne from "memoize-one";
import React from "react";
import {PrimaryToolbar} from "./InspectorPanel_PrimaryToolbar.js";
import {ScrollView} from "./ScrollView.js";
import {getSelection, getObjects} from "./processing.js";
import {ProtoView} from "./ProtoView.js";

import * as Action from "./Action.js";

import "./InspectorPanel_PrimaryPane.css";

function highlightSource(file) {
  if (file._cache) return file._cache;
  const lines = file.text.split("\n");
  let state;
  const highlighted = [];
  for (let line of lines) {
    const result = hljs.highlight("lua", line, true, state);
    highlighted.push({ __html: result.value });
    state = result.top;
  }
  return file._cache = {
    sourceLines: lines,
    sourceLinesSyntaxHighlighted: highlighted
  };
}

const createDecoration = memoizeOne((trace, objects, mode, expand) => {
  const decoration = [];
  const bytecodeDecoration = [];
  const mark = trace.type === "trace" ? "tr" : "tr-abort";
  let counter = 0;
  let lastDecoration;
  let lastProto = -1;
  let lastLineno = -1;
  for (let ti of trace.trace) {
    const [proto, blineno] = ti;
    if (mode === "l") {
      const lineno = objects[proto].bcmap[blineno];
      if (!expand || !expand[proto] || !expand[proto][lineno]) {
        if (lastProto !== proto || lastLineno !== lineno) {
          lastDecoration = putMark(decoration, proto, lineno, mark);
          lastDecoration.slugs.push(++counter);
          lastProto = proto;
          lastLineno = lineno;
        }
        continue;
      }
    }
    lastDecoration = putMark(bytecodeDecoration, proto, blineno, mark);
    lastDecoration.slugs.push(++counter);
    lastProto = -1;
  }
  if (lastDecoration) {
    if (trace.type === "trace.abort")
      lastDecoration.slugs.push(trace.reason);
    else if (trace.info.linktype === "interpreter")
      lastDecoration.slugs.push("→iinterpreter");
  }
  for (let ti of trace.trace) {
    const [proto, blineno] = ti;
    const lineno = objects[proto].bcmap[blineno];
    if (decoration[proto] && decoration[proto][lineno]) continue;
    const lineMap = objects[proto].linemap;
    const protoBytecodeDecoration = bytecodeDecoration[proto];
    for (let i = lineMap[lineno]; i < lineMap[lineno + 1]; ++i) {
      if (!protoBytecodeDecoration[i]) {
        putMark(decoration, proto, lineno, "");
        break;
      }
    }
    putMark(decoration, proto, lineno, mark);
  }
  return { decoration, bytecodeDecoration };
});

function putMark(decoration, proto, lineno, mark) {
  if (!decoration[proto]) {
    return (decoration[proto] = [])[lineno] = { className: mark, slugs: [] };
  }
  return decoration[proto][lineno] || (
    decoration[proto][lineno] = { className: mark, slugs: [] }
  );
}

export class PrimaryPane extends React.PureComponent {
  selectItem = (id) => {
    this.props.dispatch(Action.propertySet({ selection: id }));
  }
  clearSelection = () => this.props.dispatch(
    Action.propertySet({ selection: -1 })
  );
  expandToggle = (lid, protoId) => this.props.dispatch(
    Action.inspectorPanelExpandToggle(protoId, lid)
  );
  render() {
    const response = this.props.state.response;
    const mode = this.props.state["inspectorPanel.mode"] || "l";
    const selection = getSelection(this.props.state);
    const expand = this.props.state["inspectorPanel.expand"];
    const objects = getObjects(this.props.state);
    let decoration = [];
    let bytecodeDecoration = decoration;
    const selected = objects[this.props.state.transientSelection || selection];
    let filter = false;
    if (selected && (selected.type === "trace"
      || selected.type === "trace.abort")
    ) {
      const bundle = createDecoration(selected, objects, mode, expand);
      filter = this.props.state.enableFilter;
      decoration = bundle.decoration;
      bytecodeDecoration = bundle.bytecodeDecoration;
    }
    return (
      <React.Fragment>
        <PrimaryToolbar {...this.props}/>
        <ScrollView className="proto-list-view" onClick={this.clearSelection}>{
          response.error ? (
            <div className="alert alert-danger" role="alert">
              <strong>Something wrong!</strong> {response.error + ""}
            </div>
          ): null
        }{
          objects.map((proto, index) => (
            proto.type !== "proto"
              || filter && index !== selection
              && !decoration[index] && !bytecodeDecoration[index] ?
            null :
            <ProtoView
              key={index}
              mode={mode}
              selection={selection === index ? selection : -1}
              proto={proto}
              expand={expand && expand[proto.id]}
              selectItem={this.selectItem}
              expandToggle={this.expandToggle}
              decoration={decoration[index]}
              bytecodeDecoration={bytecodeDecoration[index]}
              {...highlightSource(objects[proto.file])}
            />
          ))
        }</ScrollView>
      </React.Fragment>
    );
  }
}
