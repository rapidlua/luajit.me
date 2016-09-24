import React from "react";
import {render} from "react-dom";

import {importData} from "./importData.jsx";
import {FuncProtoView} from "./funcProtoView.jsx";

class App extends React.Component {
  constructor(props) {
    const input = "local sum = 1\nfor i = 2,10000 do\n\u00a0\u00a0sum = sum + i\nend";
    super(props)
    this.state = {
      data: null,
      mode: "lua",
      selection: null,
      input: input,
      topPanel: true,
      leftPanel: false,
      rightPanel: false
    }
  }
  handleTextChange(e) {
    var text = e.target.firstChild.data;
    this.setState({input: e.target.value})
  }
  handleClear(e) {
    e.stopPropagation();
    this.setState({input: "", data: {}})
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
  selectMode(e, mode) {
    e.stopPropagation();
    if (mode != 'mixed' && mode != "luabc")
      mode = "lua";
    this.setState({mode: mode})
  }
  togglePanel(e, panel) {
    e.stopPropagation();
    var upd = {};
    upd[panel] = !this.state[panel];
    this.setState(upd);
  }
  render () {
    var mode = this.state.mode;
    var selection = this.state.selection;
    var data = this.state.data;
    var selectItem = this.selectItem.bind(this)
    var content = data != null && typeof(data.protos)=="object" && data.protos.map(
      function(proto,i) {
        return (
          <FuncProtoView
            data={proto} key={i} mode={mode}
            handleClick={selectItem} selection={selection}/>
        )
      }) || []
    var numLines = Math.min(25,
      Math.max(4, this.state.input.split(/\n/).length));
    if (data!=null && data.error) {
      content.splice(0, 0, (
        <div className="alert alert-danger" role="alert">
          <strong>Something wrong!</strong> {data.error}
        </div>
      ));
    }
    var selectMode = this.selectMode.bind(this);
    var modeSwitch = (
      <div className="toolbar-group toolbar-em">
        <span
          className={"toolbar-btn toolbar-sw-" + (mode == "lua" ? "on" : "off")}
          onClick={((e)=>selectMode(e, "lua"))}
        >Lua</span>
        <span
          className={"toolbar-btn toolbar-sw-" + (mode == "luabc" ? "on" : "off")}
          onClick={((e)=>selectMode(e, "luabc"))}
        >Bytecode</span>
        <span
          className={"toolbar-btn toolbar-sw-" + (mode == "mixed" ? "on" : "off")}
          onClick={((e)=>selectMode(e, "mixed"))}
        >Mixed</span>
      </div>
    );
    var togglePanel = this.togglePanel.bind(this);
    var panelSwitches = (
      <div className="toolbar-group">
        <span
          className={"toolbar-btn toolbar-sw-" + (this.state.leftPanel ? "on" : "off")}
          onClick={((e)=>togglePanel(e, "leftPanel"))}
        >
          <span className="pane-toggle-icon">▏</span>
        </span>
        <span
          className={"toolbar-btn toolbar-sw-" + (this.state.topPanel ? "on" : "off")}
          onClick={((e)=>togglePanel(e, "topPanel"))}
        >
          <span className="pane-toggle-icon">▔</span>
        </span>
        <span
          className={"toolbar-btn toolbar-sw-" + (this.state.rightPanel ? "on" : "off")}
          onClick={((e)=>togglePanel(e, "rightPanel"))}
        >
          <span className="pane-toggle-icon">▕</span>
        </span>
      </div>
    )
    return (
      <div className="app-container">
        <div className={"top-pane" + (this.state.topPanel ? "" : " invisible")}>
          <textarea
            rows={numLines} onChange={this.handleTextChange.bind(this)}
            value={this.state.input}
          />
        </div>
        <div className="app-main">
          <div className={"left-pane" + (this.state.leftPanel ? "" : " invisible")}>
            <div className="toolbar"/>
          </div>
          <div className="primary-pane">
            <div className="toolbar">
              <div className="toolbar-group">
                <span className="toolbar-btn" onClick={this.handleSubmit.bind(this)}>Update</span>
                <span className="toolbar-btn" onClick={this.handleClear.bind(this)}>Clear</span>
              </div>
              {modeSwitch}
              {panelSwitches}
            </div>
            <div className="content-host" onClick={selectItem}>
              <div className="content-area">
                {content}
              </div>
            </div>
          </div>
          <div className={"right-pane" + (this.state.rightPanel ? "" : " invisible")}>
            <div className="toolbar"/>
          </div>
        </div>
      </div>
    );
  }
}

render(<App/>, document.getElementById('app'));
