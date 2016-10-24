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
            key     = {mode.name}
            isOn    = {currentMode == mode.name}
            onClick = {(e)=>selectMode(e, mode.name)}
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
      {name:"lua",   label:"Lua"},
      {name:"luabc", label:"Bytecode"},
      {name:"mixed", label:"Mixed"}
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
          {name:"lua",   label:"Lua"},
          {name:"luabc", label:"Bytecode"},
          {name:"mixed", label:"Mixed"}
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

class FuncProtoDetailsLine extends React.Component {
  render() {
    var value = this.props.value;
    var valueHl = this.props.valueHl;
    if (typeof(value) === "boolean")
      value = value && "Yes" || "No";
    return (
      <div className="details-kv">
        <div className="details-key">{this.props.label}</div>
        {
          valueHl ?
          <div className="details-val" dangerouslySetInnerHTML={{__html: valueHl}}/> :
          <div className="details-val">{value}</div>
        }
      </div>
    );
  }
}

class FuncProtoConstsTable extends React.Component {
  render() {
    return (
      <div className="func-proto-consts-view">
        {
          this.props.data.map((k, i) => (
            <FuncProtoDetailsLine
              key={i} label={i} value={k.value} valueHl={k.valueHl}
            />
          ))
        }
      </div>
    );
  }
}

class FuncProtoDetailsPanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {mode: "info"};
    this.modes = [
      {name:"info", label:"Info"},
      {name:"k",    label:"Consts"},
    ];
    this.renders = {
      info: this.renderInfo.bind(this),
      k: this.renderConsts.bind(this)
    };
    this.infoProps = [
      {key: "params",     label: "Params:"},
      {key: "isvararg",   label: "Is Vararg:"},
      {key: "stackslots", label: "Stack Slots:"},
      {key: "upvalues",   label: "Upvalues:"},
      {key: "bytecodes",  label: "Bytecodes:"},
      {key: "nconsts",    label: "Consts:"},
      {key: "gcconsts",   label: "GC Consts:"},
      {key: "children",   label: "Has Children:"}
    ];
    this.selectMode = this.selectMode.bind(this);
  }
  selectMode(e, mode) {
    e.stopPropagation();
    this.setState({mode: mode})
  }
  renderInfo() {
    var info = this.props.data.info;
    return (
      <div className="func-proto-info-view">
        { this.infoProps.map((ip) => (
          <FuncProtoDetailsLine
            key={ip.key}
            label={ip.label}
            value={info[ip.key]}
          />
        )) }
      </div>
    )
  }
  renderConsts() {
    var result = [];
    var proto = this.props.data;
    if (proto.consts.length != 0) {
      result.push(
        <FuncProtoConstsTable
          key="consts" data={proto.consts}
        />
      );
    }
    if (proto.gcConsts.length != 0) {
      result.push(
        <FuncProtoConstsTable
          key="gcConsts" data={proto.gcConsts}
        />
      );
    }
    return result;
  }
  render() {
    return (
      <AppPanel
        className="right-pane"
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
        content={this.renders[this.state.mode]()}
        placeholder="No Consts"
      />
    );
  }
}

class TraceThumb extends React.Component {
  render() {
    var data = this.props.data;
    var selectItem = this.props.selectItem;
    return (
      <div
        className={"trace-thumb" + (this.props.selection == data.id ? "-active": "")}
        onClick={(e)=>selectItem(e,data.id)}
      >
        {data.index}
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

class TraceDetailsPanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {mode: "info"};
    this.modes = [
      {name:"info", label:"Info"},
      {name:"ir",   label:"IR"},
      {name:"asm",  label:"Asm"}
    ];
    this.selectMode = this.selectMode.bind(this);
  }
  selectMode(e, mode) {
    e.stopPropagation();
    this.setState({mode: mode})
  }
  render() {
    return (
      <AppPanel
        className="right-pane"
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
