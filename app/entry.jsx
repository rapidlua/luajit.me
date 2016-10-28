import React from "react";
import {render} from "react-dom";

import {importData} from "./importData.jsx";
import {FuncProtoView} from "./funcProtoView.jsx";

class ToggleButton extends React.Component {
  render() {
    return (
      <span
        className={"toolbar-btn toolbar-sw-" + (this.props.isOn ? "on" : "off")}
        onClick={this.props.onClick}
      >
        {this.props.label}
      </span>
    );
  }
}

class ModeSwitcher extends React.Component {
  render() {
    var currentMode = this.props.currentMode;
    var selectMode = this.props.selectMode;
    return (
      <div className="toolbar-group toolbar-em">
        {this.props.modes.map((mode) => (
          <ToggleButton
            key     = {mode.key}
            isOn    = {currentMode == mode.key}
            onClick = {(e)=>selectMode(e, mode.key)}
            label   = {mode.label || mode.name}
          />
        ))}
      </div>
    )
  }
}

class AppPanel extends React.Component {
  render() {
    var content   = this.props.content;
    var noContent = !content || Array.isArray(content) && content.length == 0;
    return (
      <div className={this.props.className}>
        {this.props.toolbar}
        <div className="content-host" onClick={this.props.contentOnClick}>
        {
          noContent ?
          <div className="content-placeholder">
            {this.props.placeholder || "No Data"}
          </div> :
          <div className="content-area">{content}</div>
        }
        </div>
        <div className="pane-resizer"></div>
      </div>
    )
  }
}

class ErrorBanner extends React.Component {
  render() {
    return (
      <div className="alert alert-danger" role="alert">
        <strong>Something wrong!</strong> {this.props.message}
      </div>
    );
  }
}

class PrimaryPanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {mode: "lua"};
    this.modes = [
      {key:"lua",   label:"Lua"},
      {key:"luabc", label:"Bytecode"},
      {key:"mixed", label:"Mixed"}
    ];
    this.selectMode = this.selectMode.bind(this);
  }
  selectMode(e, mode) {
    e.stopPropagation();
    this.setState({mode: mode})
  }
  makeMenu(modeSwitcher) {
    return <div className="toolbar"><div/>{modeSwitcher}<div/></div>;
  }
  render() {
    var selectItem = this.props.selectItem;
    var selection = this.props.selection;
    var data = this.props.data;
    var error = this.props.error;
    var mode = this.state.mode;
    var toolbar = (this.props.makeMenu || this.makeMenu)(
      <ModeSwitcher
        currentMode = {mode}
        selectMode = {this.selectMode}
        modes = {[
          {key:"lua",   label:"Lua"},
          {key:"luabc", label:"Bytecode"},
          {key:"mixed", label:"Mixed"}
        ]}
      />
    );
    var content = data.map(
      function(proto,i) {
        return (
          <FuncProtoView
            data={proto} key={i} mode={mode}
            handleClick={selectItem} selection={selection}
          />
        )
      }) || [];
    if (error)
      content.splice(0, 0, <ErrorBanner key="error" message={error}/>);
    return (
      <AppPanel
        className="primary-pane"
        toolbar={toolbar}
        content={content}
        contentOnClick={selectItem}
      />
    );
  }
}

class PropListItem extends React.Component {
  render() {
    return (
      <div className="prop-list-item">
        <div className="prop-list-item-label">{this.props.label}</div>
        <div className="prop-list-item-value">{this.props.value}</div>
      </div>
    );
  }
}

class PropListView extends React.Component {
  render() {
    var data = this.props.data;
    var schema = this.props.schema;
    var content = [];
    if (schema) {
      schema.forEach(function(schemaItem, i) {
        var key = schemaItem.key;
        var rawValue = data[key];
        var fmt = schemaItem.fmt;
        var value;
        if (fmt)
          value = fmt(rawValue);
        else if (rawValue!==undefined)
          value = ""+rawValue;
        if (value) {
          content.push(
            <PropListItem
              key={key}
              value={value}
              label={schemaItem.label || key}
            />
          );
        }
      });
    } else for (var key in data) {
      if (data.hasOwnProperty(key)) {
        content.push(
          <PropListItem
            key={key}
            value={""+data[key]}
            label={key}
          />
        );
      }
    }
    return (
      <div className="prop-list-view">{content}</div>
    );
  }
}


class CodeLine extends React.Component {
  render() {
    /*
     * className?, onClick?, onMouseEnter?, onMouseLeave?,
     * codeHi | code, lineno | gutter, overlay?
     */
    var code = (
      this.props.codeHi !== undefined ?
      <div dangerouslySetInnerHTML={{__html: this.props.codeHi}}/> :
      <div>{this.props.code}</div>
    );
    if (this.props.overlay)
      code = <div>{code}{this.props.overlay}</div>;
    var gutter;
    if (this.props.gutter !== undefined)
      gutter = this.props.gutter;
    else if (this.props.lineno !== undefined)
      gutter = <div className="gutter-area">{this.props.lineno}</div>;
    return (
      <div
        className={this.props.className || "xcode-line"}
        data-lineno={this.props.lineno}
        onClick={this.props.onClick}
        onMouseEnter={this.props.onMouseEnter}
        onMouseLeave={this.props.onMouseLeave}
      >
        {gutter}
        <div className="xcode-area">{code}</div>
      </div>
    );
  }
}

class CodeView extends React.Component {
  render() {
    var xform = this.props.xform;
    return (
      <div className={this.props.className || "xcode-view"}>
        {this.props.data.map((item, i) => (
          React.createElement(CodeLine, xform ? xform(item, i) : item, null)
        ))}
      </div>
    )
  }
}

function formatBool(v) {
  if (v == true) return "Yes";
  if (v == false) return "No";
}

function kToCodeLine(k, i) {
  return {
    key: i,
    lineno: i,
    code: k.value,
    codeHi: k.valueHi
  }
}

class FuncProtoDetailsPanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {mode: "info"};
    this.modes = [
      {key:"info",   label:"Info"},
      {key:"consts", label:"Consts"},
    ];
    this.infoSchema = [
      {key:"params",     label:"Params"},
      {key:"isvararg",   label:"Is Vararg",    fmt:formatBool},
      {key:"stackslots", label:"Stack Slots"},
      {key:"upvalues",   label:"Upvalues"},
      {key:"bytecodes",  label:"Bytecodes"},
      {key:"nconsts",    label:"Consts"},
      {key:"gcconsts",   label:"GC Consts"},
      {key:"children",   label:"Has Children", fmt:formatBool}
    ];
    this.selectMode = this.selectMode.bind(this);
  }
  selectMode(e, mode) {
    e.stopPropagation();
    this.setState({mode: mode})
  }
  render() {
    var content;
    if (this.state.mode == 'info') {
      content = (
        <PropListView
          data={this.props.data.info}
          schema={this.infoSchema}
        />
      );
    } else {
      content = [];
      var proto = this.props.data;
      if (proto.consts.length != 0) {
        content.push(
          <CodeView
            key='consts'
            className="xcode-view consts"
            data={proto.consts} xform={kToCodeLine}
          />
        );
      }
      if (proto.gcConsts.length != 0) {
        content.push(
          <CodeView
            key='gcConsts'
            className="xcode-view consts"
            data={proto.gcConsts} xform={kToCodeLine}
          />
        );
      }
    }
    return (
      <AppPanel
        className="right-pane"
        content={content}
        toolbar={
          <div className="toolbar">
            <div/>
            <ModeSwitcher
              modes={this.modes}
              currentMode={this.state.mode}
              selectMode={this.selectMode}
            />
            <div/>
          </div>
        }
        placeholder="No Consts"
      />
    );
  }
}

class TraceThumb extends React.Component {
  render() {
    var data = this.props.data;
    var selectItem = this.props.selectItem;
    var className = "trace-thumb";
    if (this.props.selection == data.id)
      className += " active";
    if (data.info.linktype == "interpreter" || !data.info.parent || data.info.error)
      className += " special";
    if (data.info.error)
      className += " error";
    return (
      <div className={className} onClick={(e)=>selectItem(e,data.id)}>
        <div>{data.index}</div>
      </div>
    );
  }
}

class TraceBrowserPanel extends React.Component {
  render() {
    var data = this.props.data;
    var selection = this.props.selection;
    var selectItem = this.props.selectItem;
    return (
      <AppPanel
        className="left-pane"
        toolbar={<div className="toolbar"></div>}
        content={data.filter((item)=>item).map((item, i) => (
          <TraceThumb
            key={i}
            data={item} selection={selection} selectItem={selectItem}
          />
        ))}
        contentOnClick={selectItem}
        placeholder="No Traces"
      />
    );
  }
}

function number4(i) {
  var s = "0000"+i
  return s.substr(s.length-4)
}

class TraceDetailsPanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {mode: "info"};
    this.modes = [
      {key:"info", label:"Info"},
      {key:"ir",   label:"IR"},
      {key:"asm",  label:"Asm"}
    ];
    this.infoSchema = [
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
    this.selectMode = this.selectMode.bind(this);
    this.irLineOnMouseEnter = this.irLineOnMouseEnter.bind(this);
    this.irLineOnMouseLeave = this.irLineOnMouseLeave.bind(this);
  }
  selectMode(e, mode) {
    e.stopPropagation();
    this.setState({mode: mode})
  }
  irLineOnMouseEnter(e) {
    this.setState({activeIrLine: e.currentTarget.getAttribute('data-lineno')-1});
  }
  irLineOnMouseLeave(e) {
    this.setState({activeIrLine: undefined})
  }
  render() {
    var content;
    var mode = this.state.mode;
    if (mode == "info") {
      content = (
        <PropListView
          data={this.props.data.info}
          schema={this.infoSchema}
        />
      );
    } else if (mode == "ir") {
      var ir = this.props.data.ir;
      if (ir.length != 0) {
        var activeLine = ir[this.state.activeIrLine];
        var emphasize = {};
        if (activeLine) {
          var re = /[0-9]{4,}/g;
          var m;
          while ((m = re.exec(activeLine.code))) {
            emphasize[m[0]-1] = true;
          }
        }
        var irLineOnMouseEnter = this.irLineOnMouseEnter;
        var irLineOnMouseLeave = this.irLineOnMouseLeave;
        content = (
          <CodeView
            className="xcode-view ir"
            data={ir}
            xform={(ir, i) => ({
              className: emphasize[i] ? "xcode-line em" : "xcode-line",
              key: i,
              lineno: number4(i+1),
              code: ir.code,
              onMouseEnter: irLineOnMouseEnter,
              onMouseLeave: irLineOnMouseLeave
            })}
          />
        );
      }
    } else {
      var asm = this.props.data.asm;
      if (asm.length != 0) {
        content = (
          <CodeView
            data={asm}
            xform={(asm, i) => ({
              key: i,
              code: asm.code,
              codeHi: asm.codeHi
            })}
          />
        );
      }
    }
    return (
      <AppPanel
        className="right-pane"
        content={content}
        toolbar={
          <div className="toolbar">
            <div/>
            <ModeSwitcher
              modes={this.modes}
              currentMode={this.state.mode}
              selectMode={this.selectMode}
            />
            <div/>
          </div>
        }
      />
    );
  }
}

class App extends React.Component {
  constructor(props) {
    const input = "local sum = 1\nfor i = 2,10000 do\n\u00a0\u00a0sum = sum + i\nend";
    super(props);
    this.state = {
      data: {protos: [], traces: []},
      selection: null,
      input: input,
      topPanel: true,
      leftPanel: false,
      rightPanel: false
    };
    this.handleTextChange = this.handleTextChange.bind(this);
    this.handleClear = this.handleClear.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.selectItem = this.selectItem.bind(this);
    this.togglePanel = this.togglePanel.bind(this);
    this.makeMenu = this.makeMenu.bind(this);
  }
  handleTextChange(e) {
    this.setState({input: e.target.value})
  }
  handleClear(e) {
    e.stopPropagation();
    this.setState({input: "", data: {protos: [], traces: []}, selection: null})
  }
  handleSubmit(e) {
    e.stopPropagation();
    $.ajax({
      type: "POST",
      url: "/run",
      dataType: "json",
      async: true,
      data: JSON.stringify({source:this.state.input}),
      success: function(response) {
        console.log(response)
        this.handleResponse(response);
      }.bind(this),
      error: function(response, _, errorText) {
        this.handleResponse(response.responseJson || {error: errorText});
      }.bind(this)
    })
  }
  handleResponse(response) {
    var data = importData(response);
    var update = {data: data};
    /* auto-select first prototype */
    if (this.state.selection == null && data.protos.length != 0)
      update.selection = 'P1';
    this.setState(update);
  }
  selectItem(e, id) {
    e.stopPropagation();
    this.setState({selection: id})
  }
  togglePanel(e, panel) {
    e.stopPropagation();
    var upd = {};
    upd[panel] = !this.state[panel];
    this.setState(upd);
  }
  makeMenu(items) {
    var togglePanel = this.togglePanel.bind(this);
    return (
      <div className="toolbar">
        <div className="toolbar-group">
          <span className="toolbar-btn" onClick={this.handleSubmit}>Update</span>
          <span className="toolbar-btn" onClick={this.handleClear}>Clear</span>
        </div>
        {items}
        <div className="toolbar-group">
          <ToggleButton
            isOn    = {this.state.leftPanel}
            onClick = {(e)=>togglePanel(e, "leftPanel")}
            label   = {<span className="pane-toggle-icon">&#x258f;</span>}
          />
          <ToggleButton
            isOn    = {this.state.topPanel}
            onClick = {(e)=>togglePanel(e, "topPanel")}
            label   = {<span className="pane-toggle-icon">&#x2594;</span>}
          />
          <ToggleButton
            isOn    = {this.state.rightPanel}
            onClick = {(e)=>togglePanel(e, "rightPanel")}
            label   = {<span className="pane-toggle-icon">&#x2595;</span>}
          />
        </div>
      </div>
    );
  }
  makeRightPanel() {
    var selection = this.state.selection;
    if (selection) {
      var protoSelected = selection.match(/P([0-9]+)/);
      if (protoSelected) {
        var index = protoSelected[1] - 1;
        /* may become invalid after reload */
        if (this.state.data.protos[index])
          return <FuncProtoDetailsPanel data={this.state.data.protos[index]}/>;
      }
      var traceSelected = selection.match(/T([0-9]+)/);
      if (traceSelected) {
        var index = traceSelected[1] - 1;
        /* may become invalid after reload */
        if (this.state.data.traces[index])
          return <TraceDetailsPanel data={this.state.data.traces[index]}/>;
      }
    }
    return (
      <AppPanel
        className="right-pane"
        toolbar={<div className="toolbar"></div>}
        placeholder="No Selection"
      />
    );
  }
  render () {
    var selection = this.state.selection;
    var data = this.state.data;
    return (
      <div className="app-container">
        {
          this.state.topPanel == false ? "" :
          <div className="top-pane">
            <textarea
              rows="5" onChange={this.handleTextChange}
              value={this.state.input}
            />
          </div>
        }
        <div className="app-main">
          {
            this.state.leftPanel == false ? "" :
            <TraceBrowserPanel
              data={data.traces}
              selection={selection}
              selectItem={this.selectItem}
            />
          }
          <PrimaryPanel
            data={data.protos}
            error={data.error}
            selection={selection}
            selectItem={this.selectItem}
            makeMenu={this.makeMenu}
          />
          {
            this.state.rightPanel == false ? "" : this.makeRightPanel()
          }
        </div>
      </div>
    );
  }
}

render(<App/>, document.getElementById('app'));
