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
          <div className="content-placeholder">{this.props.placeholder || "No Data"}</div> :
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
    var content = Array.isArray(data.protos) && data.protos.map(
      function(proto,i) {
        return (
          <FuncProtoView
            data={proto} key={i} mode={mode}
            handleClick={selectItem} selection={selection}
          />
        )
      }) || [];
    if (data.error)
      content.splice(0, 0, <ErrorBanner key="error" message={data.error}/>);
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

class BasicDetailLine extends React.Component {
  render() {
    var value = this.props.value;
    if (typeof(value) === "boolean")
      value = value && "Yes" || "No";
    return (
      <div>
        <div>{this.props.label}</div>
        <div>{value}</div>
      </div>
    );
  }
}

class FuncProtoInfoPanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {mode: "info"};
    this.modes = [
      {name:"info", label:"Info"},
      {name:"k",    label:"Consts"},
    ];
    this.renders = {
      info: this.renderInfo.bind(this),
      k: this.renderConsts
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
          <BasicDetailLine
            key={ip.key}
            label={ip.label}
            value={info[ip.key]}
          />
        )) }
      </div>
    )
  }
  renderConsts() {
    return "Consts";
  }
  render() {
    console.log(this.props.data);
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
      />
    );
  }
}

class App extends React.Component {
  constructor(props) {
    const input = "local sum = 1\nfor i = 2,10000 do\n\u00a0\u00a0sum = sum + i\nend";
    super(props);
    this.state = {
      data: {},
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
    var text = e.target.firstChild.data;
    this.setState({input: e.target.value})
  }
  handleClear(e) {
    e.stopPropagation();
    this.setState({input: "", data: {}, selection: null})
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
        this.setState({data: importData(response)})
      }.bind(this),
      error: function(response, _, errorText) {
        var result = response.responseJson || {error: errorText}
        this.props.replaceData(result)
      }.bind(this)
    })
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
    var selectedProto = selection && selection.match(/P([0-9]+)/);
    if (selectedProto)
      return <FuncProtoInfoPanel data={this.state.data.protos[selectedProto[1]-1]}/>;
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
    var numLines = Math.min(25,
      Math.max(4, this.state.input.split(/\n/).length));
    return (
      <div className="app-container">
        {
          this.state.topPanel == false ? "" :
          <div className="top-pane">
            <textarea
              rows={numLines} onChange={this.handleTextChange}
              value={this.state.input}
            />
          </div>
        }
        <div className="app-main">
          {
            this.state.leftPanel == false ? "" :
            <AppPanel
              className="left-pane"
              toolbar={<div className="toolbar"></div>}
              placeholder="No Traces"
            />
          }
          <PrimaryPanel
            data={data}
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
