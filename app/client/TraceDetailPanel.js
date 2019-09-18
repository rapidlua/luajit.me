import React from "react";
import {AppPanel} from "./AppPanel.js";
import {PropListView} from "./PropListView.js";
import {CodeView} from "./codeView.js";
import {number4} from "./number4.js";

export class TraceDetailPanel extends React.Component {
  state = {};
  infoSchema = [
    {key:"error",      label:"Error",      fmt:function(val) {
      if (val) return (
        <span className="error">{val}</span>
      );
    }},
    {key:"observed",   label:"Times Seen", fmt:function(val) {
      if (val > 1) return val;
    }},
    {key:"parent",     label:"Parent"},
    {key:"parentexit", label:"Parent Exit"},
    {key:"link",       label:"Link"},
    {key:"linktype",   label:"Link Type",  fmt:function(val) {
      if (val != "none") return val;
    }},
    {key:"nexit",      label:"Num Exits"}
  ];
  irLineOnMouseEnter = (e) => {
    this.setState({activeIrLine: e.currentTarget.getAttribute('data-lineno')-1});
  }
  irLineOnMouseLeave = (e) => {
    this.setState({activeIrLine: undefined})
  }
  render() {
    let content, placeholder;
    switch (this.props.mode) {
    case "info":
      content = (
        <PropListView
          data={this.props.data.info}
          schema={this.infoSchema}
        />
      );
      break;
    case "ir":
      placeholder = "No IR";
      const ir = this.props.data.ir;
      if (ir.length != 0) {
        const activeLine = ir[this.state.activeIrLine];
        let emphasize = {};
        if (activeLine) {
          var re = /[0-9]{4,}/g;
          var m;
          while ((m = re.exec(activeLine.code))) {
            emphasize[m[0]-1] = true;
          }
        }
        const irLineOnMouseEnter = this.irLineOnMouseEnter;
        const irLineOnMouseLeave = this.irLineOnMouseLeave;
        content = (
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
      break;
    case "asm":
      placeholder = "No Asm";
      const asm = this.props.data.asm;
      if (asm.length != 0) {
        content = (
          <CodeView
            data={asm.map((asm, i) => ({
              key: i,
              code: asm.code,
              codeHi: asm.codeHi
            }))}
          />
        );
      }
      break;
    }
    return (
      <AppPanel
        className="right-pane"
        toolbar={this.props.toolbar}
        content={content}
        placeholder={placeholder}
        panelWidth={this.props.panelWidth}
        setPanelWidth={this.props.setPanelWidth}
      />
    );
  }
}
