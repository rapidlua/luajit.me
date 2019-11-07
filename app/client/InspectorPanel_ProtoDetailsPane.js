import React from "react";
import {CodeView} from "./CodeView.js";
import {ModeSwitcher} from "./ModeSwitcher.js";
import {Placeholder} from "./Placeholder.js";
import {PropListItem} from "./PropListView.js";
import {ScrollView} from "./ScrollView.js";
import {Toolbar} from "./Toolbar.js";
import {getSelection} from "./processing.js";

import * as Action from "./Action.js";

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

function formatGcConst(gck) {
  switch (gck.type) {
  case "number":
    return '<span class="hljs-number">' + gck.value + "</span>";
  case "string":
    return '<span class="hljs-string">' + JSON.stringify(gck.value) + "</span>";
  case "proto":
    return '<span class="proto-ref">Proto #' + gck.value + "</span>";
  case "table":
    return "{" + gck.value.map(kv =>
      "[" + formatGcConst(kv[0]) + "] = " + formatGcConst(kv[1])
    ).join(", ") + "}";
  default:
    return gck.value;
  }
}

function ProtoConstTableView(props) {
  const proto = props.proto;
  const noConsts = proto.consts.length === 0;
  const noGcConsts = proto.gcconsts.length === 0;
  if (noConsts && noGcConsts)
    return <Placeholder>No Consts</Placeholder>;
  return (
    <React.Fragment> {
      noConsts ? null : <CodeView className="xcode-view consts" data={
        proto.consts.map((k, index) => ({
          key: index,
          lineno: index,
          codeHi: '<span class="hljs-number">' + k + "</span>"
        }))
      }/>}{
      noGcConsts ? null : <CodeView className="xcode-view consts" data={
        proto.gcconsts.map((gck, index) => ({
          key: index,
          lineno: index,
          codeHi: formatGcConst(gck)
        }))
      }/>
    }</React.Fragment>
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
          <ProtoConstTableView proto={proto}/>
        </ScrollView>
      </React.Fragment>
    );
  }
}
