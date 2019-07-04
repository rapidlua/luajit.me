import React from "react";
import {render} from "react-dom";

import {importData} from "./importData.jsx";
import {PropListView} from "./propListView.jsx";
import {CodeView} from "./codeView.jsx";
import graph from "./graph.js";
import {targets} from "../server/targets.js";

import "./styles.css";

/* 1-> "0001" */
function number4(i) {
  var s = "0000"+i
  return s.substr(s.length-4)
}

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
  constructor(props) {
    super(props);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
  }
  handleMouseDown(e) {
    var parentNode = e.target.parentNode;
    var panelRect = parentNode.getBoundingClientRect();
    this.dragStartX = e.clientX;
    this.dragDir = (
      e.clientX < panelRect.left + panelRect.width/2 ? -1 : +1
    );
    this.resizee = parentNode;
    this.initialWidth = panelRect.width;
    var overlay = this.overlay;
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.setAttribute(
          "style",
          `position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 10000;
          cursor: col-resize;`
      );
      overlay.addEventListener("mousemove", this.handleMouseMove);
      this.overlay = overlay;
    }
    $("#app").append(overlay);
    $(window).on("mouseup", this.handleMouseUp);
    e.preventDefault();
    e.stopPropagation();
  }
  computeWidth(e) {
    var delta = this.dragDir*(e.clientX - this.dragStartX);
    var width = this.initialWidth + delta;
    return Math.min(400, width > 200 ? width : 0);
  }
  handleMouseUp(e) {
    $(window).off("mouseup", this.handleMouseUp);
    var overlay = this.overlay;
    if (overlay)
      overlay.remove();
    var setPanelWidth = this.props.setPanelWidth;
    if (setPanelWidth)
      setPanelWidth(this.computeWidth(e));
  }
  handleMouseMove(e) {
    var delta = this.dragDir*(e.clientX - this.dragStartX);
    $(this.resizee).css("width", this.computeWidth(e) + "px");
  }
  render() {
    var content   = this.props.content;
    var noContent = !content || Array.isArray(content) && content.length == 0;
    return (
      <div
        className={this.props.className}
        style={{width:(this.props.panelWidth || 300)+"px"}}
      >
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
        <div
            className="pane-resizer"
            onMouseDown={this.handleMouseDown}
        />
      </div>
    )
  }
}

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

class FuncProtoDetailPanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
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
  }
  render() {
    var content;
    if (this.props.mode == 'info') {
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
    }
    return (
      <AppPanel
        className="right-pane"
        content={content}
        toolbar={this.props.toolbar}
        placeholder="No Consts"
        panelWidth={this.props.panelWidth}
        setPanelWidth={this.props.setPanelWidth}
      />
    );
  }
}

class TraceBrowserPanel extends React.Component {
  constructor(props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);
    this.handleMouseOver = this.handleMouseOver.bind(this);
    this.handleMouseOut = this.handleMouseOut.bind(this);
  }
  handleClick(e) {
    this.props.selectItem(e, e.currentTarget.getAttribute("data-trace-id"));
  }
  handleMouseOver(e) {
    this.props.selectTransient(e, e.currentTarget.getAttribute("data-trace-id"));
  }
  handleMouseOut(e) {
    this.props.selectTransient(e, null);
  }
  render() {
    var data = this.props.data;
    var selection = this.props.selection;
    var handleClick = this.handleClick;
    var handleMouseOver = this.handleMouseOver;
    var handleMouseOut = this.handleMouseOut;
    var dotJSON = this.props.dotJSON;
    var content;
    if (dotJSON) {
      const noStroke = {stroke:null};
      const noFontStyles = {fontFamily:null, fontSize:null};
      content = (
        <div className="g-wrapper">
          <svg {...graph.getSVGAttrs(dotJSON, {units:"px"})}>
            {
              (dotJSON.objects||[]).map(node=>{
                const innerHTML = [];
                const render = graph.createSVGRenderer(innerHTML);
                node._draw_.filter(cmd=>cmd.op==="e").forEach((cmd,index)=>{
                  const [x,y,w,h] = cmd.rect;
                  innerHTML.push(
                    '<ellipse class="', ["g-ring", "g-outter-ring"][index],
                    '" cx="', x, '" cy="', y, '" rx="', w, '" ry="', h, '"/>'
                  );
                });
                if (node._ldraw_)
                  node._ldraw_.forEach(cmd=>render(cmd, noFontStyles));
                let className = "g-trace-thumb";
                if (this.props.selection===node.id) className += " active";
                const trace = data[+node.id.substr(1)];
                if (trace && trace.info.error) className += " error";
                return (
                  <g
                   key={node.id}
                   className={className}
                   data-trace-id={node.id}
                   onClick={handleClick}
                   onMouseOver={handleMouseOver}
                   onMouseOut={handleMouseOut}
                   dangerouslySetInnerHTML={{__html: innerHTML.join("")}}
                  />
                );
              })
            }
            {
              (dotJSON.edges||[]).map(edge=>{
                const innerHTML = [];
                const render = graph.createSVGRenderer(innerHTML);
                if (edge._draw_) edge._draw_.forEach(render);
                if (edge._hdraw_) edge._hdraw_.forEach(cmd=>render(cmd, noStroke));
                if (edge._tdraw_) edge._tdraw_.forEach(cmd=>render(cmd, noStroke));
                let className = "g-trace-link";
                const initiator = data[edge.id.substr(1).split(":")[0]];
                if (initiator && initiator.info.linktype==="stitch") className += " stitch";
                return (
                  <g
                   key={edge.id}
                   className={className}
                   dangerouslySetInnerHTML={{__html: innerHTML.join("")}}
                  />
                );
              })
            }
          </svg>
        </div>
      );
    }
    return (
      <AppPanel
        className="left-pane"
        toolbar={this.props.toolbar}
        content={content}
        contentOnClick={this.props.selectItem}
        placeholder="No Traces"
        panelWidth={this.props.panelWidth}
        setPanelWidth={this.props.setPanelWidth}
      />
    );
  }
}

class TraceDetailPanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
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
    this.irLineOnMouseEnter = this.irLineOnMouseEnter.bind(this);
    this.irLineOnMouseLeave = this.irLineOnMouseLeave.bind(this);
  }
  irLineOnMouseEnter(e) {
    this.setState({activeIrLine: e.currentTarget.getAttribute('data-lineno')-1});
  }
  irLineOnMouseLeave(e) {
    this.setState({activeIrLine: undefined})
  }
  render() {
    var content, placeholder;
    var mode = this.props.mode;
    if (mode == "info") {
      content = (
        <PropListView
          data={this.props.data.info}
          schema={this.infoSchema}
        />
      );
    } else if (mode == "ir") {
      placeholder = "No IR";
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
    } else {
      placeholder = "No Asm";
      var asm = this.props.data.asm;
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

function createDot(traces, topple) {
  var dot = "digraph{ranksep=.32;edge[arrowsize=.9];node[shape=circle,margin=.007,height=.41,width=0]";
  if (topple) {
    dot += ";rankdir=LR";
    traces = traces.slice().reverse();
  }
  // do nodes
  traces.forEach((trace) => {
    if (trace) {
      var info = trace.info;
      dot = dot + ";" + trace.index + "[id=" + trace.id + (
        info.parent === undefined ?
        ",shape=doublecircle" : ""
      )+ "]";
    }
  });
  // do edges
  traces.forEach((trace) => {
    if (trace) {
      var info = trace.info;
      // if the trace links back to its parent, output
      // single bi-directional edge, unless the total
      // number of nodes is low (2 separate edges look better) or
      // if link types are different
      if (traces.length > 3 && info.link !== undefined &&
          info.link == info.parent &&
          traces[info.parent].info.linktype != "stitch")
      {
        dot = dot + ";" + info.parent + "->" + trace.index + (
          "[id=\"T"+info.parent + ":"+trace.id+"\", dir=both]"
        );
      } else {
        if (info.link !== undefined) {
          dot = dot + ";" + trace.index + "->" + info.link + (
            "[id=\""+trace.id + ":T"+info.link+"\"]"
          );
        }
        if (info.parent !== undefined) {
          dot = dot + ";" + info.parent + "->" + trace.index + (
            "[id=\"T"+info.parent + ":"+trace.id+"\"]"
          );
        }
      }
    }
  });
  return dot + "}";
}

const SELECTION_AUTO = 'selection-auto';

class App extends React.Component {
  constructor(props) {
    super(props);
    var help = require("raw-loader!./snippets/help.lua");
    var snippets = [
      {label: "blank",      code: ""},
      {label: "help",       code: help},
      {label: "loops",      code: require("raw-loader!./snippets/loops.lua")},
      {label: "recursion",  code: require("raw-loader!./snippets/recursion.lua")},
      {label: "table",      code: require("raw-loader!./snippets/table.lua")},
      {label: "reduce",     code: require("raw-loader!./snippets/reduce.lua")},
      {label: "reduce2",    code: require("raw-loader!./snippets/reduce2.lua")},
      {label: "mandelbrot", code: require("raw-loader!./snippets/mandelbrot.lua")},
      {label: "jit.off",    code: require("raw-loader!./snippets/jit.off.lua")},
      {label: "stitching",  code: require("raw-loader!./snippets/stitching.lua")},
    ];
    this.state = {
      data: {prototypes: [], traces: []},
      snippets: snippets,
      selection: SELECTION_AUTO,
      input: help,
      target: targets[targets.length - 1],
      enablePmode: false,
      showEditorOverlay: false,
      showTopPanel: false,
      showLeftPanel: true,
      showRightPanel: true,
      enableFilter: false,
      mode: "lua",
      protoMode: "info",
      traceMode: "info"
    };
    this.modes = [
      {key:"lua",   label:"Lua"},
      {key:"luabc", label:"Bytecode"},
      {key:"mixed", label:"Mixed"}
    ];
    this.protoModes = [
      {key:"info",   label:"Info"},
      {key:"consts", label:"Consts"},
    ];
    this.traceModes = [
      {key:"info", label:"Info"},
      {key:"ir",   label:"IR"},
      {key:"asm",  label:"Asm"}
    ];
    this.toppleTraceGraph = false;
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleTextChange = this.handleTextChange.bind(this);
    this.spawnEditor = this.spawnEditor.bind(this);
    this.killEditor = this.killEditor.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.selectMode = this.selectMode.bind(this);
    this.selectProtoMode = this.selectProtoMode.bind(this);
    this.selectTraceMode = this.selectTraceMode.bind(this);
    this.selectItem = this.selectItem.bind(this);
    this.selectTransient = this.selectTransient.bind(this);
    this.toggleOption = this.toggleOption.bind(this);
    this.toolbarHover = this.toolbarHover.bind(this);
    this.toolbarUnhover = this.toolbarUnhover.bind(this);
    this.installSnippet = this.installSnippet.bind(this);
    this.setTarget = this.setTarget.bind(this);
    this.setWidthL = this.setWidthL.bind(this);
    this.setWidthR = this.setWidthR.bind(this);
  }
  componentDidMount() {
    $(document.body).on("keydown", this.handleKeyDown);
    this.handleSubmit();
  }
  componenWillUnMount() {
    $(document.body).off("keydown", this.handleKeyDown);
  }
  handleKeyDown(e) {
    if (e.metaKey || e.target.tagName == "INPUT" ||
        e.target.tagName == "TEXTAREA")
    {
      return;
    }
    var editorActive = this.state.showEditorOverlay;
    if (e.keyCode == 13 /* Enter */) {
      if (editorActive)
        this.handleSubmit(e);
      this.toggleOption(e, "showEditorOverlay");
    }
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
      this.handleSubmit(e);
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
  toggleOption(e, option) {
    e.stopPropagation();
    var upd = {};
    upd[option] = !this.state[option];
    if (upd.enablePmode || this.state.enablePmode) {
      if (option == "showRightPanel" ||
          this.state.showLeftPanel && this.state.showRightPanel)
        upd.showLeftPanel = false;
      else if (option == "showLeftPanel")
        upd.showRightPanel = false;
    }
    this.setState(upd);
  }
  handleTextChange(e) {
    this.setState({input: e.target.value})
  }
  spawnEditor(e) {
    this.setState({showEditorOverlay: true});
  }
  killEditor(e) {
    this.handleSubmit(e);
    this.setState({showEditorOverlay: false});
  }
  handleSubmit(e) {
    e && e.stopPropagation();
    $.ajax({
      type: "POST",
      url: "/run",
      dataType: "json",
      async: true,
      /* trim trailing whitespace otherwize we get extra empty line */
      data: JSON.stringify({
        source: this.state.input.replace(/\n$/,''),
        target: this.state.target
      }),
      success: function(response) {
        this.handleResponse(response);
      }.bind(this),
      error: function(request, _, exception) {
        this.handleResponse({error: request.responseText || exception || "Network error"});
      }.bind(this)
    })
  }
  handleResponse(response) {
    var data = importData(response);
    var update = {data: data};
    /* auto-select first trace or prototype - performed for the very
     * first request only; this is to ensure that right pane is
     * populated hence the App looks better on the first glance :) */
    if (this.state.selection == SELECTION_AUTO)
      update.selection = data.traces && data.traces[0] ? 'T0' : 'P0';
    if (data.traces.length !== 0) {
      graph.renderJSON(
        createDot(data.traces, this.toppleTraceGraph),
        (error, result) => {
          const [llx,lly,urx,ury] = result.bb.split(',');
          // toople if width exceeds height by 64px or more
          if (urx - llx - lly + ury > 64 && this.state.data === data) {
            graph.renderJSON(
              createDot(
                data.traces, this.toppleTraceGraph = !this.toppleTraceGraph
              ),
              (error, result)=>this.setState({dotJSON:result})
            );
          } else {
            this.setState({dotJSON: result});
          }
        }
      );
    } else {
      update.dotJSON = null;
    }
    this.setState(update);
  }
  selectMode(e, mode) {
    e.stopPropagation();
    this.setState({mode: mode})
  }
  selectProtoMode(e, mode) {
    e.stopPropagation();
    this.setState({protoMode: mode})
  }
  selectTraceMode(e, mode) {
    e.stopPropagation();
    this.setState({traceMode: mode})
  }
  selectItem(e, id) {
    e.stopPropagation();
    this.setState({selection: id})
  }
  selectTransient(e, id) {
    e.stopPropagation();
    this.setState({transientSelection: id})
  }
  toolbarHover() {
    this.setState({toolbarHover: true});
  }
  toolbarUnhover() {
    this.setState({toolbarHover: false});
  }
  makePrimaryToolbar() {
    var toggleOption = this.toggleOption;
    return (
      <div
        className="toolbar"
        onMouseEnter={this.toolbarHover} onMouseLeave={this.toolbarUnhover}
      >
        <div className="toolbar-group">
          <span className="toolbar-btn" onClick={this.handleSubmit}>Run</span>
          <span className="toolbar-btn" onClick={this.spawnEditor}>Edit</span>
        </div>
        <ModeSwitcher
          currentMode = {this.state.mode}
          selectMode = {this.selectMode}
          modes = {this.modes}
        />
        <div className="toolbar-group pane-toggle">
          <ToggleButton
            isOn    = {this.state.showLeftPanel}
            onClick = {(e)=>toggleOption(e, "showLeftPanel")}
            label   = {<span className="pane-toggle-icon">&#x258f;</span>}
          />
          <ToggleButton
            isOn    = {this.state.showTopPanel}
            onClick = {(e)=>toggleOption(e, "showTopPanel")}
            label   = {<span className="pane-toggle-icon">&#x2594;</span>}
          />
          <ToggleButton
            isOn    = {this.state.showRightPanel}
            onClick = {(e)=>toggleOption(e, "showRightPanel")}
            label   = {<span className="pane-toggle-icon">&#x2595;</span>}
          />
        </div>
      </div>
    );
  }
  makeTraceBrowserToolbar() {
    var toggleOption = this.toggleOption;
    return (
      <div
        className="toolbar"
        onMouseEnter={this.toolbarHover} onMouseLeave={this.toolbarUnhover}
      >
        <div/>
        <div className="toolbar-group">
          <ToggleButton
            isOn    = {this.state.enableFilter}
            onClick = {(e)=>toggleOption(e, "enableFilter")}
            label   = "&#x25d2;"
          />
        </div>
      </div>
    );
  }
  makeProtoDetailToolbar() {
    return (
      <div
        className="toolbar"
        onMouseEnter={this.toolbarHover} onMouseLeave={this.toolbarUnhover}
      >
        <div/>
        <ModeSwitcher
          currentMode = {this.state.protoMode}
          selectMode = {this.selectProtoMode}
          modes = {this.protoModes}
        />
        <div/>
      </div>
    );
  }
  makeTraceDetailToolbar() {
    return (
      <div
        className="toolbar"
        onMouseEnter={this.toolbarHover} onMouseLeave={this.toolbarUnhover}
      >
        <div/>
        <ModeSwitcher
          currentMode = {this.state.traceMode}
          selectMode = {this.selectTraceMode}
          modes = {this.traceModes}
        />
        <div/>
      </div>
    );
  }
  setWidthL(width) {
    this.setState({
      showLeftPanel: width!=0,
      widthL: Math.max(200, width)
    });
  }
  setWidthR(width) {
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
        if (this.state.data.prototypes[index])
          return (
            <FuncProtoDetailPanel
              mode={this.state.protoMode}
              toolbar={this.makeProtoDetailToolbar()}
              data={this.state.data.prototypes[index]}
              panelWidth={this.state.widthR}
              setPanelWidth={this.setWidthR}
            />
          );
      }
      var traceSelected = selection.match(/T([0-9]+)/);
      if (traceSelected) {
        var index = traceSelected[1];
        /* may become invalid after reload */
        if (this.state.data.traces[index])
          return (
            <TraceDetailPanel
              mode={this.state.traceMode}
              toolbar={this.makeTraceDetailToolbar()}
              data={this.state.data.traces[index]}
              panelWidth={this.state.widthR}
              setPanelWidth={this.setWidthR}
            />
          );
      }
    }
    return (
      <AppPanel
        className="right-pane"
        toolbar={
          <div
            className="toolbar"
            onMouseEnter={this.toolbarHover} onMouseLeave={this.toolbarUnhover}
          />
        }
        placeholder="No Selection"
        panelWidth={this.state.widthR}
        setPanelWidth={this.setWidthR}
      />
    );
  }
  installSnippet(e) {
    var snippets = this.state.snippets;
    var snippet = snippets && snippets[
      +e.target.getAttribute("data-snippet-id")
    ];
    if (snippet)
      this.setState({input: snippet.code.replace(/\s*$/,"")});
  }
  setTarget(e) {
    this.setState({target: e.target.value});
  }
  render () {
    var selection = this.state.selection;
    var data = this.state.data;
    var prototypes = data.prototypes;
    var lineDecorator;
    var xselection = this.state.transientSelection || selection;
    if (xselection) {
      var traceSelected = xselection.match(/T([0-9]+)/);
      if (traceSelected) {
        var trace = this.state.data.traces[traceSelected[1]];
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
    var snippets = this.state.snippets;
    var installSnippet = this.installSnippet;
    return (
      <div
        className={
          "app-container" +
          (this.state.enablePmode ? " presentation" : "") +
          (this.state.toolbarHover ? " toolbar-hover" : "")
        }
      >
        {
          !this.state.showEditorOverlay ? "" :
          <div className="editor-overlay" onClick={this.killEditor}>
            <a
              className="github-url"
              href="https://github.com/mejedi/luajit.me"
            >
              <div dangerouslySetInnerHTML={{__html: require("raw-loader!./octocat.svg")}}/>
              <div className="speach-bubble">★ me on GitHub!</div>
            </a>
            <div className="editor-form" onClick={(e)=>(e.stopPropagation())}>
              <div className="top-btn-row">
                {
                  snippets && snippets.map((snippet, i)=>(
                    <button
                      key={i}
                      type="button"
                      className={"btn btn-sm "+({help: "btn-info", blank: "btn-danger"}[snippet.label]||"btn-warning")}
                      data-snippet-id={i}
                      onClick={installSnippet}
                    >{snippet.label}</button>
                  ))
                }
              </div>
              <textarea
                onChange={this.handleTextChange}
                value={this.state.input}
              />
              <div className="bottom-btn-row">
                <button
                  type="button" className="btn btn-primary" onClick={this.killEditor}
                >Apply</button>
                <select class="form-control" onChange={this.setTarget}>
                  {targets.map((target,index)=>(
                    <option key={index} selected={target===this.state.target}
                    >{target}</option>)
                  )}
                </select>
              </div>
            </div>
          </div>
        }
        {
          !this.state.showTopPanel ? "" :
          <div
            className="top-pane"
            onMouseEnter={this.toolbarHover} onMouseLeave={this.toolbarUnhover}
          >
            <textarea
              rows="5" onChange={this.handleTextChange}
              value={this.state.input}
            />
          </div>
        }
        <div className="app-main">
          {
            !this.state.showLeftPanel ? "" :
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
            toolbar={this.makePrimaryToolbar()}
            lineDecorator={lineDecorator}
          />
          {
            !this.state.showRightPanel ? "" : this.makeRightPanel()
          }
        </div>
      </div>
    );
  }
}

render(<App/>, document.getElementById('app'));
