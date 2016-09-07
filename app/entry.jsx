import React from "react";
import {render} from "react-dom";

class SubmitForm extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      // Safari quirk: leading spaces ignoted in a textarea
      // with white-space: nowrap style (\u00a0 is a non-breaking space)
      input: "local sum = 0\nfor i = 1,10000 do\n\u00a0\u00a0sum = sum + i\nend",
      error: null
    }
  }
  handleTextChange(e) {
    var text = e.target.firstChild.data;
    this.setState({input: e.target.value})
  }
  handleClear() {
    this.setState({input: "", error: null, elapsed: null})
    this.props.replaceData({})
  }
  handleSubmit(e) {
    e.preventDefault();
    $.ajax({
      type: "POST",
      url: "/run",
      dataType: "json",
      async: true,
      data: JSON.stringify({source:this.state.input}),
      success: function(response) {
        console.log(response)
        this.setState({
          input: this.state.input,
          error: response.error || null,
          elapsed: response.elapsed_time || null
        })
        this.props.replaceData(response)
      }.bind(this),
      error: function(response, _, errorText) {
        var result = response.responseJson || {error: errorText}
        this.setState({
          input: this.state.input,
          error: result.error,
          elapsed: result.elapsed_time || null
        })
        this.props.replaceData(result)
      }.bind(this)
    })
  }
  render() {
    var plaque
    if (this.state.error != null)
      plaque = <div className="alert alert-danger" role="alert">
          <strong>Something wrong!</strong> {this.state.error}
      </div>
    else
      plaque = ''
    return (
      <form onSubmit={this.handleSubmit.bind(this)}>
        <div className="plaque-wrapper">{plaque}</div>
        <div className="form-group">
          <textarea
            rows="5" onChange={this.handleTextChange.bind(this)}
            value={this.state.input}
          />
        </div>
        <div className="form-group">
          <div className="btn-toolbar">
            <button type="submit" className="btn btn-success">Run</button>
            <button
              type="button" className="btn btn-danger"
              onClick={this.handleClear.bind(this)}
            >
              Clear
            </button>
          </div>
        </div>
      </form>
    );
  }
}

function visIndex(i) {
  var s = "0000"+i
  return s.substr(s.length-4)
}

function jumpTargetId(thisBc, offset) {
  return thisBc.id.replace(
    /:\d+/, ':' + (offset + Number(/=> (\d+)/.exec(thisBc.code)[1])));
}

class BytecodeLineView extends React.Component {
  handleClick(e) {
    if (e.metaKey) return;
    var offset = 0;
    if (/^FORL/.exec(this.props.data.code))
      offset = -1;
    window.location = '#'+jumpTargetId(this.props.data, offset);
  }
  handleMouseEnter() {
    this.props.setJumpTarget(jumpTargetId(this.props.data, 0))
  }
  handleMouseLeave() {
    this.props.setJumpTarget(null);
  }
  render() {
    var bc = this.props.data;
    var onClick = ''
    var onMouseEnter = ''
    var onMouseLeave = ''
    var className = "code-line code-line-luabc"
    if (/=> (\d+)/.exec(bc.code) != null) {
      onClick = this.handleClick.bind(this);
      onMouseEnter = this.handleMouseEnter.bind(this);
      onMouseLeave = this.handleMouseLeave.bind(this);
      className += " jump-cmd";
    }
    if (this.props.viewState.jumpTarget == bc.id)
      className += " active-jump-target"
    return (
      <div
        className={className}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <a name={bc.id}></a>
        <span className="gutter">{visIndex(bc.index)}</span>
        <span
          dangerouslySetInnerHTML={{ __html: bc.codeHl }}
        />
      </div>
    );
  }
}

class SourceLineView extends React.Component {
  constructor(props) {
    super(props)
    this.state = {expand: null}
  }
  mayExpand() {
    var line = this.props.data;
    return line.codes && line.codes.length != 0;
  }
  handleClick(e) {
    if (e.metaKey) return;
    var line = this.props.data;
    if (this.props.mode == 'lua') {
      if (this.state.expand == line.source)
        this.setState({expand:null})
      else
        this.setState({expand: line.source})
    }
  }
  render() {
    var line = this.props.data;
    var mode = this.props.mode;
    var enableLua = mode == "lua" || mode == "mixed";
    var enableBc = mode == "luabc" || mode == "mixed";
    var shevronSymbol = "▶"
    if (mode == "lua" && this.state.expand == line.source) {
      enableBc = true;
      shevronSymbol = "▼";
    }
    var codes = line.codes || [];
    var codeNodes = codes.map((bc, i) =>
      <BytecodeLineView
        key={i} data={bc}
        viewState={this.props.viewState}
        setJumpTarget={this.props.setJumpTarget}
      />);
    var shevron = "";
    if (mode == "lua") {
      if (this.mayExpand())
        shevron = <span className="shevron">{shevronSymbol}</span>;
    }
    var className = "code-line code-line-lua"
    if (enableLua) {
      var jumpTarget = this.props.viewState.jumpTarget;
      if (jumpTarget != null && !enableBc &&
          codes.some((code) => code.id == jumpTarget))
        className += " active-jump-target";
    } else {
      className += " invisible";
    }
    return (
      <div>
        <div
          className={className}
          onClick={(this.mayExpand() ? this.handleClick.bind(this) : "")}
        >
          <span className="gutter">{shevron}{line.index}</span>
          <span
            dangerouslySetInnerHTML={{ __html: line.sourceHl }}
          />
        </div>
        <div className={"code-block"+(enableBc ? "" : " invisible")}>
          {codeNodes}
        </div>
      </div>
    )
  }
}

class FuncProtoView extends React.Component {
  constructor(props) {
    super(props)
    this.state = {}
  }
  setJumpTarget(target) {
    this.setState({jumpTarget: target})
  }
  render() {
    var proto = this.props.data;
    var lineNodes = proto.lines.map((line, i) =>
      <SourceLineView
        data={line} key={i}
        viewState={this.state}
        setJumpTarget={this.setJumpTarget.bind(this)}
        mode={this.props.mode}
      />)
    return (
      <div className={"panel panel-default func-proto-view func-proto-view-" + this.props.mode} onClick={this.props.handleClick}>
        <div className="panel-heading">
          <h3 className="panel-title">Proto #{proto.index}</h3>
        </div>
        <div className="code-block">{lineNodes}</div>
      </div>
    )
  }
}

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
  handleClick(e) {
    if (e.metaKey)
      this.setState({mode: e.shiftKey ? this.prevMode() : this.nextMode()})
  }
  render() {
    var mode = this.state.mode;
    var protos = this.props.data.protos;
    var handler = this.handleClick.bind(this)
    var funcNodes = protos && protos.map(
      function(proto,i) {
        return (
          <FuncProtoView data={proto} key={i} mode={mode} handleClick={handler}/>
        )
      }) || []
    return (
      <div className="toplevel-block">
        {funcNodes}
      </div>
    )
  }
}

class App extends React.Component {
  constructor(props) {
    super(props)
    this.state = {data: {}}
  }
  replaceData(newData) {
    var mappedData = {}
    var source = newData.source, sourceHl; // 1-base indexing
    var protos = newData.protos;
    if (protos && source) {
      // <FIXME> -- syntax highlighting
      var i, cont, sourceHl = [];
      for (i = 0; i < source.length; i++) {
        var res = hljs.highlight('lua', source[i], true, cont);
        sourceHl[i] = res.value;
        cont = res.top;
      }
      // </FIXME>
      mappedData.protos = protos.map(function(proto, protoIdx) {
        protoIdx = protoIdx + 1// 1-base indexing
        var sourceRange = proto.src_range
        var bcMap = proto.bc_map
        var mappedLines = []
        var i
        // leading lines without bytecode
        for (i = Math.max(1, sourceRange[0]); i<bcMap[0]; i++)
          mappedLines.push({
            index: i,
            source: source[i-1],
            sourceHl: sourceHl[i-1]
          });
        // process bytecodes
        proto.bc.forEach(function(bc, bcIdx) {
          bcIdx = bcIdx + 1 // 1-base indexing
          var id = 'BC'+protoIdx+':'+bcIdx;
          var atLineNo = bcMap[bcIdx-1];
          var lastLine = mappedLines[mappedLines.length - 1];
          var code = {
              id: id,
              index: bcIdx,
              code: bc,
              codeHl: hljs.highlight('lua', bc, true).value
          }
          if (lastLine && atLineNo && lastLine.index >= atLineNo) {
            lastLine.codes.push(code);
          } else {
            // middle lines without bytecodes
            while (atLineNo && i+1 < atLineNo) {
              mappedLines.push({
                index: i+1,
                source: source[i],
                sourceHl: sourceHl[i]
              })
              i = i+1
            }
            mappedLines.push({
              index: atLineNo,
              source: source[atLineNo - 1],
              sourceHl: sourceHl[atLineNo - 1],
              codes: [code]
            });
          }
          if (atLineNo > i)
            i = atLineNo;
        });
        // trailing lines without bytecode
        for (; i < sourceRange[1]; i++)
          mappedLines.push({
            index: i+1,
            source: source[i],
            sourceHl: sourceHl[i]
          });
        var mappedProto = {
          id: 'P'+protoIdx,
          index: protoIdx,
          kNumber: proto.k_number,
          kGc: proto.k_gc,
          nParams: proto.n_params,
          nSlots: proto.n_slots,
          lines: mappedLines
        }
        return mappedProto
      })
    }
    this.setState({data: mappedData})
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
