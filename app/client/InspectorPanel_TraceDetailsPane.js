import memoizeOne from "memoize-one";
import React from "react";
import {ModeSwitcher, Mode} from "./ModeSwitcher.js";
import {number4} from "./number4.js";
import {PropListItem} from "./PropListView.js";
import {ScrollView} from "./ScrollView.js";
import {Toolbar} from "./Toolbar.js";
import {getSelection, getObjects, getSelectedObject} from "./processing.js";

import * as Action from "./Action.js";

import "./CodeView.css";
import "./InspectorPanel_TraceDetailsPane.css";

function TraceInfoView(props) {
  const trace = props.trace;
  const objects = props.objects;
  return (
    <React.Fragment>
      <PropListItem label="Abort Reason">{
        trace.type === "trace.abort"
        ? <span className="error">{trace.reason}</span>
        : undefined
      }</PropListItem>
      <PropListItem label="Times Seen">{
        trace.k
      }</PropListItem>
      <PropListItem label="Parent">{
        trace.parent !== undefined
        ? objects[trace.parent].name
        : undefined
      }</PropListItem>
      <PropListItem label="Parent Exit">{
        trace.parentexit > -1 ? trace.parentexit : undefined
      }</PropListItem>
      <PropListItem label="Link">{
        trace.link !== undefined
        ? objects[trace.link].name
        : undefined
      }</PropListItem>
      <PropListItem label="Link Type">{
        trace.info.linktype !== "none" ? trace.info.linktype : undefined
      }</PropListItem>
      <PropListItem label="Num Exits">{
        trace.info.nexit
      }</PropListItem>
    </React.Fragment>
  );
}

const getIr = memoizeOne((trace) => {
  if (!trace.ir) return [];
  return trace.ir.replace(/\s+$/, "").split("\n").map((line) => line
    .replace(/^\d+\s/,"")
  );
});

class TraceIrView extends React.PureComponent {
  state = { emphasize: [] };
  handleMouseEnter = (e) => {
    const activeLine = getIr(this.props.trace)[
      +e.currentTarget.getAttribute('data-lineno')
    ];
    const emphasize = [];
    if (activeLine) {
      const re = /[0-9]{4,}/g;
      let m;
      while ((m = re.exec(activeLine))) {
        emphasize[m[0]-1] = true;
      }
    }
    this.setState({ emphasize })
  }
  handleMouseLeave = (e) => {
    this.setState({ emphasize: [] })
  }
  render() {
    const ir = getIr(this.props.trace);
    return (
      <div
        className="trace-ir-view code-view hover-em"
      >{
        ir.map((line, index) => (
          <div
           key={index} data-lineno={index}
           className={"code-line" + (this.state.emphasize[index] ? " em" : "")}
           onMouseEnter={this.handleMouseEnter}
           onMouseLeave={this.handleMouseLeave}
          >
            <div className="code-linecell gutter">{number4(index + 1)}</div>
            <div className="code-linecell">{line}</div>
          </div>
        ))
      }</div>
    );
  }
}

const getAsm = memoizeOne((trace) => {
  if (!trace.asm) return [];
  return trace.asm.replace(/\s+$/, "").split("\n").map((line) => {
    const gist = line.replace(/^[0-9a-fA-F]+\s*/,"").replace(/->/,"; ->");
    return hljs.highlight('x86asm', gist, true).value
  });
});

function TraceAsmView(props) {
  const asm = getAsm(props.trace);
  return (
    <div className="code-view">{
      asm.map((line, index) => (
        <div key={index} className="code-line">
          <div
           className="code-linecell"
           dangerouslySetInnerHTML={{ __html: line }}
          />
        </div>
      ))
    }</div>
  );
}

function TraceDetailsToolbar(props) {
  return (
    <Toolbar {...props}>
      <ModeSwitcher
       scope="inspectorPanel.traceDetailsPane.mode"
       requestMode={requestMode}
       {...props}
      >
        <Mode id="i">Info</Mode>
        <Mode id="ir">IR</Mode>
        <Mode id="asm">Asm</Mode>
      </ModeSwitcher>
    </Toolbar>
  );
}

export function TraceDetailsPane(props) {
  const objects = getObjects(props.state);
  const trace = objects[getSelection(props.state)];
  switch (requestMode(
    props.state, props.state["inspectorPanel.traceDetailsPane.mode"])) {
  default:
    return (
      <React.Fragment>
        <TraceDetailsToolbar {...props}/>
        <ScrollView className="prop-list-view">
          <TraceInfoView trace={trace} objects={objects}/>
        </ScrollView>
      </React.Fragment>
    );
  case "ir":
    return (
      <React.Fragment>
        <TraceDetailsToolbar {...props}/>
        <ScrollView>
          <TraceIrView trace={trace}/>
        </ScrollView>
      </React.Fragment>
    );
  case "asm":
    return (
      <React.Fragment>
        <TraceDetailsToolbar {...props}/>
        <ScrollView>
          <TraceAsmView trace={trace}/>
        </ScrollView>
      </React.Fragment>
    );
  }
}

function requestMode(state, mode) {
  switch (mode) {
  default:
    return "i";
  case "ir":
    return getIr(getSelectedObject(state)).length === 0 ? "i": "ir";
  case "asm":
    return getAsm(getSelectedObject(state)).length === 0 ? "i": "asm";
  }
}
