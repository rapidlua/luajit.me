import React from "react";
import {CodeView} from "./CodeView.js";
import {ModeSwitcher} from "./ModeSwitcher.js";
import {number4} from "./number4.js";
import {Placeholder} from "./Placeholder.js";
import {PropListItem} from "./PropListView.js";
import {ScrollView} from "./ScrollView.js";
import {Toolbar} from "./Toolbar.js";

import * as Action from "./Action.js";

function TraceInfoView(props) {
  const info = props.trace.info;
  return (
    <React.Fragment>
      <PropListItem label="Error">{
        info.error && <span className="error">{info.error}</span>
      }</PropListItem>
      <PropListItem label="Times Seen">{
        info.observed > 1 ? info.observed : undefined
      }</PropListItem>
      <PropListItem label="Parent">{
        info.parent
      }</PropListItem>
      <PropListItem label="Parent Exit">{
        info.parentexit
      }</PropListItem>
      <PropListItem label="Link">{
        info.link
      }</PropListItem>
      <PropListItem label="Link Type">{
        info.linktype !== "none" ? info.linktype : undefined
      }</PropListItem>
      <PropListItem label="Num Exits">{
        info.nexit
      }</PropListItem>
    </React.Fragment>
  );
}

class TraceIrView extends React.PureComponent {
  state = {};
  irLineOnMouseEnter = (e) => {
    this.setState({activeIrLine: e.currentTarget.getAttribute('data-lineno')-1});
  }
  irLineOnMouseLeave = (e) => {
    this.setState({activeIrLine: undefined})
  }
  render() {
    const ir = this.props.trace.ir;
    if (ir.length === 0)
      return <Placeholder>No IR</Placeholder>;
    const activeLine = ir[this.state.activeIrLine];
    const emphasize = {};
    if (activeLine) {
      const re = /[0-9]{4,}/g;
      let m;
      while ((m = re.exec(activeLine.code))) {
        emphasize[m[0]-1] = true;
      }
    }
    const irLineOnMouseEnter = this.irLineOnMouseEnter;
    const irLineOnMouseLeave = this.irLineOnMouseLeave;
    return (
      <CodeView
        className="xcode-view ir"
        data={ir.map((ir, i) => ({
          className: emphasize[i] ? "xcode-line em" : "xcode-line",
          key: i,
          lineno: number4(i+1),
          code: ir.code,
          onMouseEnter: irLineOnMouseEnter,
          onMouseLeave: irLineOnMouseLeave
        }))}
      />
    );
  }
}

function TraceAsmView(props) {
  const asm = props.trace.asm;
  if (asm.length === 0)
    return <Placeholder>No Asm</Placeholder>;
  return (
    <CodeView
      data={asm.map((asm, i) => ({
        key: i,
        code: asm.code,
        codeHi: asm.codeHi
      }))}
    />
  );
}

const modes = [
  { key:"info", label: "Info" },
  { key:"ir",   label: "IR" },
  { key:"asm",  label: "Asm" }
];

class TraceDetailsToolbar extends React.PureComponent {
  selectMode = (_, mode) => this.props.dispatch(
    Action.propertySet({ traceMode: mode })
  );
  render() {
    return (
      <Toolbar {...this.props}>
        <ModeSwitcher
          currentMode={this.props.state.traceMode}
          selectMode={this.selectMode}
          modes={modes}
        />
      </Toolbar>
    );
  }
}

export function TraceDetailsPane(props) {
  const trace =
    props.state.response.traces[+props.state.selection.substr(1)];
  switch (props.state.traceMode) {
  default:
    return (
      <React.Fragment>
        <TraceDetailsToolbar {...props}/>
        <ScrollView className="prop-list-view">
          <TraceInfoView trace={trace}/>
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
