import React from "react";
import {render} from "react-dom";

import {SubmitForm} from "./submitForm.jsx";
import {importData} from "./importData.jsx";
import {FuncProtoView} from "./funcProtoView.jsx";

class PrototypesView extends React.Component {
  constructor(props) {
    super(props)
    this.state = {mode: "lua"}
  }
  nextMode() {
    return {
      mixed: "lua",
      luabc: "mixed",
      lua:   "luabc"
    } [this.state.mode];
  }
  prevMode() {
    return {
      mixed: "luabc",
      luabc: "lua",
      lua:   "mixed"
    } [this.state.mode];
  }
  handleClick(e, id) {
    e.stopPropagation();
    console.log('click')
    if (e.metaKey)
      this.setState({mode: e.shiftKey ? this.prevMode() : this.nextMode()});
    else
      this.setState({selection: id})
  }
  render() {
    var mode = this.state.mode;
    var selection = this.state.selection;
    var protos = this.props.data.protos;
    var handler = this.handleClick.bind(this)
    var funcNodes = protos && protos.map(
      function(proto,i) {
        return (
          <FuncProtoView
            data={proto} key={i} mode={mode}
            handleClick={handler} selection={selection}/>
        )
      }) || []
    return <div className="toplevel-block" onClick={handler}>{funcNodes}</div>;
  }
}

class App extends React.Component {
  constructor(props) {
    super(props)
    this.state = {data: {}}
  }
  replaceData(newData) {
    this.setState({data: importData(newData)})
  }
  render () {
    return (
      <div>
        <div className="jumbotron">
          <SubmitForm replaceData={this.replaceData.bind(this)}/>
        </div>
        <PrototypesView data={this.state.data}/>
      </div>
    );
  }
}

render(<App/>, document.getElementById('app'));
