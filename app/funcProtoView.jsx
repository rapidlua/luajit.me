import React from "react";
import {render} from "react-dom";

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
    var line = this.props.data;
    if (this.props.mode == 'lua') {
      if (this.state.expand == line.source)
        this.setState({expand:null})
      else
        this.setState({expand: line.source})
      e.stopPropagation();
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

export class FuncProtoView extends React.Component {
  constructor(props) {
    super(props)
    this.state = {}
  }
  setJumpTarget(target) {
    this.setState({jumpTarget: target})
  }
  handleClick(e) {
    return this.props.handleClick(e, this.props.data.id);
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
    var className ="panel panel-" + (this.props.selection == proto.id
      ? "primary" : "default");
    className += ' func-proto-view func-proto-view-' + this.props.mode;
    return (
      <div className={className} onClick={this.handleClick.bind(this)}>
        <div className="panel-heading">
          <h3 className="panel-title">Proto #{proto.index}</h3>
        </div>
        <div className="code-block">{lineNodes}</div>
      </div>
    )
  }
}
