import React from "react";
import {AppPanel} from "./AppPanel.js";
import {PropListView} from "./PropListView.js";
import {CodeView} from "./codeView.js";

function formatBool(v) {
  if (v == true) return "Yes";
  if (v == false) return "No";
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

const infoSchema = [
  {key:"params",     label:"Params"},
  {key:"isvararg",   label:"Is Vararg",    fmt:formatBool},
  {key:"stackslots", label:"Stack Slots"},
  {key:"upvalues",   label:"Upvalues"},
  {key:"bytecodes",  label:"Bytecodes"},
  {key:"nconsts",    label:"Consts"},
  {key:"gcconsts",   label:"GC Consts"},
  {key:"children",   label:"Has Children", fmt:formatBool}
];

export function FuncProtoDetailPanel(props) {
  let content;
  switch (props.mode) {
  case "info":
    content = (
      <PropListView
        data={props.data.info}
        schema={infoSchema}
      />
    );
    break;
  case "consts":
    content = [];
    const proto = props.data;
    if (proto.consts.length != 0) {
      content.push(
        <CodeView
          key='consts'
          className="xcode-view consts"
          data={proto.consts.map(kToCodeLine)}
        />
      );
    }
    if (proto.gcConsts.length != 0) {
      content.push(
        <CodeView
          key='gcConsts'
          className="xcode-view consts"
          data={proto.gcConsts.map(kToCodeLine)}
        />
      );
    }
    break;
  }
  return (
    <AppPanel
     className="right-pane"
     content={content}
     toolbar={props.toolbar}
     placeholder="No Consts"
     panelWidth={props.panelWidth}
     setPanelWidth={props.setPanelWidth}
    />
  );
}
