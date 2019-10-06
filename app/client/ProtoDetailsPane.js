import React from "react";
import {CodeView} from "./codeView.js";
import {ModeSwitcher} from "./ModeSwitcher.js";
import {Placeholder} from "./Placeholder.js";
import {PropListItem} from "./PropListView.js";
import {ScrollView} from "./ScrollView.js";
import {Toolbar} from "./Toolbar.js";

import * as Action from "./Action.js";

function formatBool(v) {
  if (v == true) return "Yes";
  if (v == false) return "No";
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

/* {const} -> presentation suitable for codeView */
function kToCodeLine(k, i) {
  return {
    key: i,
    lineno: i,
    code: k.value,
    codeHi: k.valueHi
  }
}

function ProtoConstTableView(props) {
  const proto = props.proto;
  if (proto.consts.length === 0 && proto.gcConsts.length === 0)
    return <Placeholder>No Consts</Placeholder>;
  return (
    <React.Fragment> {
      proto.consts.length === 0 ? null
      : <CodeView
         className="xcode-view consts"
         data={proto.consts.map(kToCodeLine)}
        />
    }{
      proto.gcConsts.length === 0 ? null
      : <CodeView
         className="xcode-view consts"
         data={proto.gcConsts.map(kToCodeLine)}
        />
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
  const proto =
    props.state.response.prototypes[+props.state.selection.substr(1)];
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
