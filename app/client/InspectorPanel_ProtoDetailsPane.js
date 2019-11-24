import React from "react";
import {ModeSwitcher, Mode} from "./ModeSwitcher.js";
import {PropListItem} from "./PropListView.js";
import {ScrollView} from "./ScrollView.js";
import {getSelectedObject} from "./processing.js";

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
        <div className="code-line" key={index}>
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

function requestMode(state, mode) {
  switch (mode) {
  case "k":
    const proto = getSelectedObject(state);
    if (proto.ktable.length !== 0 || proto.gcktable.length !== 0)
      return "k";
  default:
    return "i";
  }
}

export function ProtoDetailsToolbar(props) {
  return (
    <ModeSwitcher
      scope="inspectorPanel.protoDetailsPane.mode"
      requestMode={requestMode}
      {...props}
    >
      <Mode id="i">Info</Mode>
      <Mode id="k">Consts</Mode>
    </ModeSwitcher>
  );
}

export function ProtoDetailsPane(props) {
  const proto = getSelectedObject(props.state);
  switch (requestMode(
    props.state, props.state["inspectorPanel.protoDetailsPane.mode"])) {
  default:
    return (
      <ScrollView className="prop-list-view">
        <ProtoInfoView proto={proto}/>
      </ScrollView>
    );
  case "k":
    return (
      <ScrollView>
        <ProtoConstTableView consts={proto.ktable}/>
        <ProtoConstTableView consts={proto.gcktable}/>
      </ScrollView>
    );
  }
}
