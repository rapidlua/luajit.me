import React from "react";
import {ModeSwitcher} from "./ModeSwitcher.js";
import {Placeholder} from "./Placeholder.js";
import {PropListItem} from "./PropListView.js";
import {ScrollView} from "./ScrollView.js";
import {Toolbar} from "./Toolbar.js";
import {getSelection} from "./processing.js";

import * as Action from "./Action.js";

import "./CodeView.css";
import "./InspectorPanel_ProtoDetailsPane.css";

function formatBool(v) {
  if (v === true) return "Yes";
  if (v === false) return "No";
}

function ProtoInfoView(props) {
  const info = props.proto.info;
  return (
    <React.Fragment>
      <PropListItem label="Params">{
        props.proto.info.params
      }</PropListItem>
      <PropListItem label="Is Vararg">{
        formatBool(info.isvararg)
      }</PropListItem>
      <PropListItem label="Stack Slots">{
        info.stackslots
      }</PropListItem>
      <PropListItem label="Upvalues">{
        info.upvalues
      }</PropListItem>
      <PropListItem label="Bytecodes">{
        info.bytecodes
      }</PropListItem>
      <PropListItem label="Consts">{
        info.nconsts
      }</PropListItem>
      <PropListItem label="GC Consts">{
        info.gcconsts
      }</PropListItem>
      <PropListItem label="Has Children">{
        formatBool(info.children)
      }</PropListItem>
    </React.Fragment>
  );
}

function formatConst(k) {
  switch (k.type) {
  case "number":
    return '<span class="hljs-number">' + k.value + "</span>";
  case "string":
    return '<span class="hljs-string">' + JSON.stringify(k.value) + "</span>";
  case "proto":
    return "Proto #" + k.value;
  case "table":
    return "{" + k.value.map(kv =>
      "[" + formatConst(kv[0]) + "] = " + formatConst(kv[1])
    ).join(", ") + "}";
  default:
    return k.value;
  }
}

function ProtoConstTableView(props) {
  if (props.consts.length === 0) return null;
  return (
    <div className="proto-ktable-view code-view">{
      props.consts.map((k, index) => (
        <div className="code-line">
          <div className="code-linecell gutter">{index}</div>
          <div
           className="code-linecell"
           dangerouslySetInnerHTML={{ __html: formatConst(k) }}
          />
        </div>
      ))
    }</div>
  );
}

function ProtoConstsView(props) {
  const proto = props.proto;
  if (proto.ktable.length === 0 && proto.gcktable.length === 0)
    return <Placeholder>No Consts</Placeholder>;
  return (
    <React.Fragment>
      <ProtoConstTableView consts={proto.ktable}/>
      <ProtoConstTableView consts={proto.gcktable}/>
    </React.Fragment>
  );
}

const modes = [
  { key: "info",   label: "Info"},
  { key: "consts", label: "Consts"},
];

class ProtoDetailsToolbar extends React.PureComponent {
  selectMode = (_, mode) => this.props.dispatch(
    Action.propertySet({ protoMode: mode })
  );
  render() {
    return (
      <Toolbar {...this.props}>
        <ModeSwitcher
          currentMode={this.props.state.protoMode}
          selectMode={this.selectMode}
          modes={modes}
        />
      </Toolbar>
    );
  }
}

export function ProtoDetailsPane(props) {
  const proto = props.state.response.objects[getSelection(props.state)];
  switch (props.state.protoMode) {
  default:
    return (
      <React.Fragment>
        <ProtoDetailsToolbar {...props}/>
        <ScrollView className="prop-list-view">
          <ProtoInfoView proto={proto}/>
        </ScrollView>
      </React.Fragment>
    );
  case "consts":
    return (
      <React.Fragment>
        <ProtoDetailsToolbar {...props}/>
        <ScrollView>
          <ProtoConstsView proto={proto}/>
        </ScrollView>
      </React.Fragment>
    );
  }
}
