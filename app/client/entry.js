import {debounce} from "./debounce";

import React from "react";
import {render} from "react-dom";

import {importData} from "./importData.js";
import {targets} from "../server/targets.js";

import {ProgressIndicator} from "./ProgressIndicator.js";
import {AppPanel} from "./AppPanel.js"
import {CodeView} from "./codeView.js";
import {ToggleButton} from "./ToggleButton.js";
import {ModeSwitcher} from "./ModeSwitcher.js";
import {TraceDetailPanel} from "./TraceDetailPanel.js";
import {FuncProtoDetailPanel} from "./FuncProtoDetailPanel.js";
import {TraceBrowserPanel} from "./TraceBrowserPanel.js";
import {ToolbarHoverTrigger, Toolbar, ToolbarGroupLeft, ToolbarGroupRight} from "./Toolbar.js";
import {EditorOverlay} from "./EditorOverlay.js";
import {PrimaryToolbar} from "./PrimaryToolbar.js";
import {number4} from "./number4.js";

import * as Action from "./Action.js";

import "./styles.css";

function findLineByBytecodeIndex(lines, index)
{
  return lines.find((line)=>(
    line.bytecode && line.bytecode.length != 0 &&
    line.bytecode[0].index <= index &&
    index < line.bytecode[0].index + line.bytecode.length
  ));
}

function findJumpTarget(lines, index)
{
  var line = findLineByBytecodeIndex(lines, index);
  var bytecode = line && line.bytecode[index-line.bytecode[0].index].code;
  if (bytecode) {
    var maybeTarget = bytecode.match(/=>\s*(\d{4})/);
    return maybeTarget && +maybeTarget[1];
  }
}

class LuaCodeView extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.toggleExpand = this.toggleExpand.bind(this);
    this.collapseViaBcLine = this.collapseViaBcLine.bind(this);
    this.bcLineOnMouseEnter = this.bcLineOnMouseEnter.bind(this);
    this.bcLineOnMouseLeave = this.bcLineOnMouseLeave.bind(this);
  }
  toggleExpand(e) {
    if (this.props.mode != 'lua') {
      /* clicks don't expand things in these modes */
      return;
    }
    e.stopPropagation();
    var lineno = +e.currentTarget.getAttribute("data-lineno");
    var line = this.props.data.find((line) => (line.lineno == lineno));
    if (line) {
      var key = 'expand' + line.key;
      var upd = {};
      upd[key] = !this.state[key] || undefined;
      this.setState(upd);
    }
  }
  collapseViaBcLine(e) {
    if (this.props.mode != 'lua') {
      /* clicks don't expand things in these modes */
      return;
    }
    e.stopPropagation();
    var index = +e.currentTarget.getAttribute("data-lineno");
    var line = findLineByBytecodeIndex(this.props.data, index);
    if (line) {
      var key = 'expand' + line.key;
      var upd = {};
      upd[key] = undefined;
      this.setState(upd);
    }
  }
  bcLineOnMouseEnter(e) {
    var index = +e.currentTarget.getAttribute('data-lineno');
    var jumpTarget = findJumpTarget(this.props.data, index);
    if (jumpTarget) {
      this.setState({emBytecodeIndex: jumpTarget});
    }
  }
  bcLineOnMouseLeave(e) {
    var index = +e.currentTarget.getAttribute('data-lineno');
    var jumpTarget = findJumpTarget(this.props.data, index);
    if (jumpTarget) {
      this.setState({emBytecodeIndex: undefined});
    }
  }
  render() {
    var state = this.state;
    var mode = this.props.mode;
    var lines = this.props.data;
    var toggleExpand = this.toggleExpand;
    var collapseViaBcLine = this.collapseViaBcLine;
    var bcLineOnMouseEnter = this.bcLineOnMouseEnter;
    var bcLineOnMouseLeave = this.bcLineOnMouseLeave;
    var emBytecodeIndex = this.state.emBytecodeIndex;
    var content = [];
    var lineDecorator = this.props.lineDecorator || ((l) => l);
    lines.forEach(function(line, i) {
      var mayExpand = line.bytecode.length || undefined;
      var expanded = state['expand' + line.key];
      var visuallyExpanded = (
        mode != "lua" || expanded
      );
      var emThis = (
        line.bytecode && line.bytecode.length != 0 &&
        line.bytecode[0].index <= emBytecodeIndex &&
        emBytecodeIndex < line.bytecode[0].index + line.bytecode.length
      );
      content.push(
        <CodeView
          className="xcode-line-group lua"
          key={'lua'+i}
          data={[lineDecorator({
            className: (
              emThis && !visuallyExpanded ? "xcode-line em" : "xcode-line"
            ),
            key: line.key,
            lineno: line.lineno,
            code: line.code, codeHi: line.codeHi,
            onClick: toggleExpand,
            gutter: mayExpand && (
              <div className="xgutter">
                <div className={"shevron"+(expanded ? " expanded" : "")}/>
                {line.lineno}
              </div>
            )
          }, line, visuallyExpanded)]}
        />
      );
      if (line.bytecode) {
        content.push(
          <CodeView
            className={"xcode-line-group luabc"+(expanded ? " expanded" : "")}
            key={'luabc'+i}
            data={line.bytecode.map((bc, i)=>lineDecorator({
              key: i,
              lineno: number4(bc.index),
              code: bc.code, codeHi: bc.codeHi,
              className: (
                bc.index == emBytecodeIndex ? "xcode-line em": "xcode-line"
              ),
              onClick: collapseViaBcLine,
              onMouseEnter: bcLineOnMouseEnter,
              onMouseLeave: bcLineOnMouseLeave,
            }, bc))}
          />
        );
      }
    });
    return (
      <div className={"xcode-view primary " + (mode || "")}>
        {content}
      </div>
    );
  }
}

class FuncProtoView extends React.Component {
  render() {
    var proto = this.props.data;
    var selectItem = this.props.selectItem;
    return (
      <div
        className={"card " + (this.props.selection == proto.id ?
          "active" : "")}
        onClick={(e)=>(selectItem(e,proto.id))}
      >
        <div className="card-header">
          <h3 className="card-title">Proto #{proto.index}</h3>
        </div>
        <LuaCodeView
          data={proto.lines}
          mode={this.props.mode}
          lineDecorator={this.props.lineDecorator}
        />
      </div>
    );
  }
}

class PrimaryPanel extends React.Component {
  render() {
    var selectItem = this.props.selectItem;
    var selection = this.props.selection;
    var data = this.props.data;
    var error = this.props.error;
    var lineDecorator = this.props.lineDecorator;
    var mode = this.props.mode;
    var content = data.map((proto) => (
      <FuncProtoView
        key={proto.id}
        data={proto}
        mode={mode}
        selection={selection}
        selectItem={selectItem}
        lineDecorator={lineDecorator}
      />
    ));
    if (error)
      content.splice(0, 0, (
        <div key="error" className="alert alert-danger" role="alert">
          <strong>Something wrong!</strong> {error+""}
        </div>
      ));
    return (
      <AppPanel
        className="primary-pane"
        toolbar={this.props.toolbar}
        content={content}
        contentOnClick={selectItem}
        placeholder=" "
      />
    );
  }
}

function resolveBcref(data, bcref)
{
  var match = bcref.match(/BC(\d+):(\d+)/);
  var proto = data.prototypes[match[1]];
  return proto.lines[proto.bytecodeMap[+match[2]]-proto.lines[0].lineno];
}

function createLineDecorator(data, trace)
{
  var decorationMap = {};
  var lastLine, lastSubIndex = 0, lastIndex = 0;
  trace.trace.forEach(function(bcref) {
    var line = resolveBcref(data, bcref);
    var bytecodeDecoration = decorationMap[bcref];
    if (!bytecodeDecoration) {
      bytecodeDecoration = [];
      decorationMap[bcref] = bytecodeDecoration;
    }
    if (line !== lastLine) {
      var lineDecoration = decorationMap[line.id];
      if (!lineDecoration) {
        lineDecoration = [];
        decorationMap[line.id] = lineDecoration;
      }
      lineDecoration.push(++lastIndex+"");
      lastSubIndex = 0;
    }
    bytecodeDecoration.push(lastIndex + "." + (++lastSubIndex));
    lastLine = line;
  });
  var xmessage = trace.info.error || (
    trace.info.linktype == "interpreter" && "→interpreter"
  );
  if (xmessage) {
    var lastBcref = trace.trace[trace.trace.length - 1];
    if (lastBcref) {
      var line = resolveBcref(data, lastBcref);
      decorationMap[lastBcref].push(xmessage);
      decorationMap[line.id].push(xmessage);
    }
  }

  return function(aline, entity, visuallyExpanded) {
    var highlightCurrent = (decorationMap[entity.id] !== undefined);
    if (highlightCurrent && entity.id[0] == "L" && visuallyExpanded) {
      // expanded line of Lua code - don't highlight, unless
      // all bytecodes in the current line are highlighted as well
      highlightCurrent = (entity.bytecode && entity.bytecode.every((bc) =>
        decorationMap[bc.id] !== undefined
      ));
    }
    if (highlightCurrent) {
      aline.className += " active-trace";
      if (trace.info.error)
        aline.className += " error";
      aline.overlay = (
        <div className="xcode-overlay">{
          decorationMap[entity.id].map((decoration, i) => (
            <span key={i}>{decoration}</span>
          ))
        }</div>
      );
    }
    return aline;
  }
}

const SELECTION_AUTO = 'selection-auto';

class App extends React.Component {
  state = {
    response: {prototypes: [], traces: []},
    selection: SELECTION_AUTO,
    _input: {
      text: require("./snippets/help.lua"),
      target: targets[targets.length - 1]
    },
    enablePmode: false,
    showTopPanel: false,
    showLeftPanel: true,
    showRightPanel: true,
    enableFilter: true,
    mode: "lua",
    protoMode: "info",
    traceMode: "info"
  };
  protoModes = [
    {key:"info",   label:"Info"},
    {key:"consts", label:"Consts"},
  ];
  traceModes = [
    {key:"info", label:"Info"},
    {key:"ir",   label:"IR"},
    {key:"asm",  label:"Asm"}
  ];
  componentDidMount() {
    const installResponse = (response) => {
      response = importData(response);
      const update = { response };
      /* auto-select first trace or prototype - performed for the very
       * first request only; this is to ensure that right pane is
       * populated hence the App looks better on the first glance :) */
      if (this.state.selection == SELECTION_AUTO)
        update.selection = response.traces && response.traces[0] ? 'T0' : 'P0';
      this.setState(update);
    }
    const submitRequest = (input) => {
      const req = new XMLHttpRequest();
      req.open("POST", "run");
      req.addEventListener("load", () => {
        if (this.state._input !== input) return;
        try {
          const response = req.status === 200
            ? JSON.parse(req.responseText) : { error: req.responseText };
          response.input = input;
          installResponse(response);
        } catch (e) {
          console.error(e);
          installResponse({ error: "Bad response", input });
        }
      });
      req.addEventListener("error", (e) => {
        console.error(e);
        if (this.state._input !== input) return;
        installResponse({ error: "Network error", input });
      });
      req.send(JSON.stringify(input));
      this.setState({ _inputSubmitted: this.state._input });
    }

    const submitRequestDebounced = debounce((input) => {
      if (!input) return;
      if (!submitRequestDebounced.isPending) submitRequestDebounced();
      submitRequest(input);
    }, 500);

    let lastInput = this.state._input;
    this.componentDidUpdate = () => {
      if (this.state._showEditorOverlay
        || this.state._input === lastInput) return;
      lastInput = this.state._input;
      if (submitRequestDebounced.isPending || this.state._input._delay)
        submitRequestDebounced(this.state._input);
      else {
        submitRequest(this.state._input);
        submitRequestDebounced();
      }
    }

    document.body.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("resize", this.handleWindowResize);

    this.componentWillUnmount = () => {
      document.body.removeEventListener("keydown", this.handleKeyDown);
      window.removeEventListener("resize", this.handleWindowResize);
      submitRequestDebounced.clear();
    }

    this.dispatch(Action.windowResize(window.innerWidth, window.innerHeight));
    submitRequest(this.state._input);
  }
  dispatch = (action) => {
    this.setState(state => {
      const result = Action.apply(state, action);
      // console.log(result);
      return result;
    });
  }
  handleWindowResize = () => {
    this.dispatch(Action.windowResize(window.innerWidth, window.innerHeight));
  }
  handleKeyDown = (e) => {
    if (e.metaKey || e.target.tagName == "INPUT" ||
        e.target.tagName == "TEXTAREA")
    {
      return;
    }
    var editorActive = this.state._showEditorOverlay;
    if (e.keyCode == 13 /* Enter */)
      this.toggleOption(e, "_showEditorOverlay");
    if (editorActive)
      return;
    if (e.keyCode == 48 /* 0 */)
      this.toggleOption(e, "showTopPanel");
    if (e.keyCode == 49 /* 1 */)
      this.toggleOption(e, "showLeftPanel");
    if (e.keyCode == 50 /* 2 */)
      this.toggleOption(e, "showRightPanel");
    if (e.keyCode == 66 /* B */)
      this.selectMode(e, this.state.mode != "luabc" ? "luabc" : "lua");
    if (e.keyCode == 70 /* F */)
      this.toggleOption(e, "enableFilter");
    if (e.keyCode == 76 /* L */)
      this.selectMode(e, "lua");
    if (e.keyCode == 77 /* M */)
      this.selectMode(e, "mixed");
    if (e.keyCode == 80 /* P */)
      this.toggleOption(e, "enablePmode");
    if (e.keyCode == 82 /* R */)
      this.dispatch(Action.inputPropertySet({}));
    /* <- / -> */
    if ((e.keyCode == 37 || e.keyCode == 39) && this.state.selection) {
      var modeKey, modes;
      if (this.state.selection[0] == 'P') {
        modeKey = "protoMode"; modes = this.protoModes;
      } else {
        modeKey = "traceMode"; modes = this.traceModes;
      }
      var currentMode = this.state[modeKey];
      var index = modes.findIndex((mode) => (mode.key == currentMode));
      if (index !== undefined) {
        var nextIndex = (
          index + modes.length + (e.keyCode == 37 ? -1 : 1)
        ) % modes.length;
        var upd = {};
        upd[modeKey] = modes[nextIndex].key;
        this.setState(upd);
      }
    }
  }
  toggleOption = (e, option) => {
    e.stopPropagation();
    var upd = {};
    upd[option] = !this.state[option];
    this.setState(upd);
  }
  handleTextChange = (e) => {
    this.dispatch(Action.inputPropertySet({
      text: e.target.value, _delay: true
    }));
  }
  selectProtoMode = (e, mode) => {
    e.stopPropagation();
    this.setState({protoMode: mode})
  }
  selectTraceMode = (e, mode) => {
    e.stopPropagation();
    this.setState({traceMode: mode})
  }
  selectItem = (e, id) => {
    e.stopPropagation();
    this.setState({selection: id})
  }
  selectTransient = (e, id) => {
    e.stopPropagation();
    this.setState({transientSelection: id})
  }
  makeTraceBrowserToolbar() {
    var toggleOption = this.toggleOption;
    return (
      <Toolbar state={this.state} dispatch={this.dispatch}>
        <ToolbarGroupRight>
          <ToggleButton
            isOn    = {this.state.enableFilter}
            onClick = {(e)=>toggleOption(e, "enableFilter")}
            label   = "&#x25d2;"
          />
        </ToolbarGroupRight>
      </Toolbar>
    );
  }
  makeProtoDetailToolbar() {
    return (
      <Toolbar state={this.state} dispatch={this.dispatch}>
        <ModeSwitcher
          currentMode = {this.state.protoMode}
          selectMode = {this.selectProtoMode}
          modes = {this.protoModes}
        />
      </Toolbar>
    );
  }
  makeTraceDetailToolbar() {
    return (
      <Toolbar state={this.state} dispatch={this.dispatch}>
        <ModeSwitcher
          currentMode = {this.state.traceMode}
          selectMode = {this.selectTraceMode}
          modes = {this.traceModes}
        />
      </Toolbar>
    );
  }
  setWidthL = (width) => {
    this.setState({
      showLeftPanel: width!=0,
      widthL: Math.max(200, width)
    });
  }
  setWidthR = (width) => {
    this.setState({
      showRightPanel: width!=0,
      widthR: Math.max(200, width)
    });
  }
  makeRightPanel() {
    var selection = this.state.selection;
    if (selection) {
      var prototypeselected = selection.match(/P([0-9]+)/);
      if (prototypeselected) {
        var index = prototypeselected[1];
        /* may become invalid after reload */
        if (this.state.response.prototypes[index])
          return (
            <FuncProtoDetailPanel
              mode={this.state.protoMode}
              toolbar={this.makeProtoDetailToolbar()}
              data={this.state.response.prototypes[index]}
              panelWidth={this.state.widthR}
              setPanelWidth={this.setWidthR}
            />
          );
      }
      var traceSelected = selection.match(/T([0-9]+)/);
      if (traceSelected) {
        var index = traceSelected[1];
        /* may become invalid after reload */
        if (this.state.response.traces[index])
          return (
            <TraceDetailPanel
              mode={this.state.traceMode}
              toolbar={this.makeTraceDetailToolbar()}
              data={this.state.response.traces[index]}
              panelWidth={this.state.widthR}
              setPanelWidth={this.setWidthR}
            />
          );
      }
    }
    return (
      <AppPanel
        className="right-pane"
        toolbar={<Toolbar state={this.state} dispatch={this.dispatch}/>}
        placeholder="No Selection"
        panelWidth={this.state.widthR}
        setPanelWidth={this.setWidthR}
      />
    );
  }
  render () {
    var selection = this.state.selection;
    var data = this.state.response;
    var prototypes = data.prototypes;
    var lineDecorator;
    var xselection = this.state.transientSelection || selection;
    if (xselection) {
      var traceSelected = xselection.match(/T([0-9]+)/);
      if (traceSelected) {
        var trace = data.traces[traceSelected[1]];
        if (trace) {
          lineDecorator = createLineDecorator(data, trace);
          if (this.state.enableFilter) {
            var keepprototypes = {};
            trace.trace.forEach(function(bcref) {
              keepprototypes[+bcref.match(/BC(\d+)/)[1]] = true;
            });
            prototypes = prototypes.filter((proto) => (
              keepprototypes[proto.index] || proto.id == selection
            ));
          }
        }
      }
    }
    return (
      <div
        className={
          "app-container" +
          (this.state.enablePmode ? " presentation" : "")
        }
      >
        <ProgressIndicator
         activity={this.state._inputSubmitted !== this.state.response.input
           ? this.state._inputSubmitted : null
         }/>
        <EditorOverlay dispatch={this.dispatch} state={this.state}/>
        {
          !this.state.showTopPanel ? null :
          <ToolbarHoverTrigger
            className="top-pane"
            state={this.state} dispatch={this.dispatch}
          >
            <textarea
              rows="5" onChange={this.handleTextChange}
              value={this.state._input.text}
            />
          </ToolbarHoverTrigger>
        }
        <div className="app-main">
          {
            !this.state.showLeftPanel ? null :
            <TraceBrowserPanel
              toolbar={this.makeTraceBrowserToolbar()}
              data={data.traces}
              dotJSON={this.state.dotJSON}
              selection={selection}
              selectItem={this.selectItem}
              selectTransient={this.selectTransient}
              panelWidth={this.state.widthL}
              setPanelWidth={this.setWidthL}
            />
          }
          <PrimaryPanel
            mode={this.state.mode}
            data={prototypes}
            error={data.error}
            selection={selection}
            selectItem={this.selectItem}
            toolbar={<PrimaryToolbar state={this.state} dispatch={this.dispatch} />}
            lineDecorator={lineDecorator}
          />
          {
            !this.state.showRightPanel ? null : this.makeRightPanel()
          }
        </div>
      </div>
    );
  }
}

render(<App/>, document.getElementById('app'));
