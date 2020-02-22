import React from "react";
import {number4} from "./number4.js";
import "./CodeView.css";
import "./ProtoView.css";

export class ProtoView extends React.PureComponent {
  handleClick = (e) => {
    e.stopPropagation();
    this.props.selectItem && this.props.selectItem(this.props.proto.id);
  }
  render() {
    const { selection, selectItem, ...childProps } = this.props;
    let className = "proto-view";
    if (selection === this.props.proto.id)
      className += " active";
    return (
      <div className={className} onClick={this.handleClick}>
        <div className="header">Proto #{this.props.proto.name}</div>
        <div className="code-view hover-em">
          <ProtoCodeView {...childProps}/>
        </div>
      </div>
    );
  }
}

class ProtoCodeView extends React.PureComponent {
  state = { targetBytecode: -1 };
  handlers = {
    expandToggleLive: (e) => {
      if (this.props.mode === "l" && this.props.expandToggle) {
        const lid = +e.currentTarget.getAttribute("data-lid");
        const lineMap = this.props.proto.linemap;
        if (lineMap[lid] !== lineMap[lid + 1]) {
          e.stopPropagation();
          this.props.expandToggle(lid, this.props.proto.id);
          this.setState({ targetBytecode: -1 });
        }
      }
    },
    expandToggleDead: (e) => {
      if (this.props.expandToggle) {
        e.stopPropagation();
        this.props.expandToggle(
          +e.currentTarget.getAttribute("data-lid"),
          this.props.proto.id
        );
      }
    },
    bytecodeLineHover: (e) => {
      const maybeTarget = this.props.proto.bc[
        +e.currentTarget.getAttribute("data-bid")
      ].match(/=>\s*(\d{4})/);
      if (maybeTarget)
        this.setState({ targetBytecode: +maybeTarget[1] });
    },
    bytecodeLineUnhover: () => {
      if (this.state.targetBytecode !== -1)
        this.setState({ targetBytecode: -1 });
    }
  };
  render() {
    const targetBytecode = this.state.targetBytecode;
    const lineMap = this.props.proto.linemap;
    if (!this.props.sourceLines || this.props.mode === "b") return (
      <BytecodeLineRange
       handlers={this.handlers}
       rangeBegin={0} rangeEnd={this.props.proto.bc.length}
       proto={this.props.proto}
       targetBytecode={this.state.targetBytecode}
       decoration={this.props.bytecodeDecoration}
      />
    );
    return this.props.proto.segments.map((segment, index) => {
      if (index & 1) return (
        <DeadLineRange
         key={index}
         handlers={this.handlers}
         rangeBegin={segment[0]} rangeEnd={segment[1]}
         proto={this.props.proto}
         sourceLines={this.props.sourceLines}
         sourceLinesSyntaxHighlighted={this.props.sourceLinesSyntaxHighlighted}
         expand={this.props.expand && this.props.expand[segment[0]]}
        />
      );
      else return (
        <LiveLineRange
         key={index}
         handlers={this.handlers}
         rangeBegin={segment[0]} rangeEnd={segment[1]}
         targetBytecode={
            targetBytecode >= lineMap[segment[0]]
            && targetBytecode < lineMap[segment[1]] ? targetBytecode : -1}
         {...this.props}
        />
      );
    });
  }
}

function DeadLineRange(props) {
  const rangeBegin = props.rangeBegin, rangeEnd = props.rangeEnd;
  if (!props.expand) {
    return (
      <div
       className="code-linegroup dead collapsed"
       data-lid={props.rangeBegin}
       onClick={props.handlers.expandToggleDead}
      >
        <div className="code-line lua">
          <div className="code-linecell gutter"/>
          <div className="code-linecell">{
            props.sourceLines[rangeBegin].match(/^\s*/)[0]}&hellip;
          </div>
        </div>
      </div>
    );
  }
  const lineDefined = props.proto.info.linedefined;
  const lines = [];
  for (let i = rangeBegin; i < rangeEnd; ++i) {
    lines.push(
      <div key={i} className="code-line lua">
        <div className="code-linecell gutter">{i + lineDefined}</div>
        <div className="code-linecell">{
          styledText(
            props.sourceLines[i + lineDefined - 1],
            props.sourceLinesSyntaxHighlighted &&
            props.sourceLinesSyntaxHighlighted[i + lineDefined - 1]
          )
        }</div>
      </div>
    );
  }
  return (
    <div
      className="code-linegroup dead expanded"
      data-lid={props.rangeBegin}
      onClick={props.handlers.expandToggleDead}
    >{
      lines
    }</div>
  );
}

function LiveLineRange(props) {
  const rangeBegin = props.rangeBegin, rangeEnd = props.rangeEnd;
  const decoration = props.decoration;
  const bytecodeDecoration = props.bytecodeDecoration;
  const targetBytecode = props.targetBytecode;
  const lineMap = props.proto.linemap;
  const lines = [];
  for (let i = rangeBegin; i < rangeEnd; ++i) {
    let decorateBytecode = false;
    for (let j = lineMap[i]; bytecodeDecoration && j < lineMap[i + 1]; ++j)
      if (decorateBytecode = !!bytecodeDecoration[j]) break;
    lines.push(
      <Line
       key={i}
       handlers={props.handlers}
       mode={props.mode}
       lineno={i}
       proto={props.proto}
       sourceLines={props.sourceLines}
       sourceLinesSyntaxHighlighted={props.sourceLinesSyntaxHighlighted}
       targetBytecode={
          targetBytecode >= lineMap[i]
          && targetBytecode < lineMap[i + 1] ? targetBytecode : -1}
       expand={props.expand && props.expand[i]}
       decoration={props.decoration && props.decoration[i]}
       bytecodeDecoration={decorateBytecode ? bytecodeDecoration : undefined}
      />
    );
  }
  return lines;
}

function Line(props) {
  const lineno = props.lineno;
  const lineMap = props.proto.linemap;
  const lineDefined = props.proto.info.linedefined;
  let lineGroupClassName = "code-linegroup";
  if (props.mode !== "m" && lineMap[lineno] !== lineMap[lineno + 1])
    lineGroupClassName += (props.expand ? " expanded" : " collapsed");
  let lineClassName = "code-line lua";
  if (props.decoration)
    lineClassName += " " + props.decoration.className;
  if (props.targetBytecode >= lineMap[lineno]
    && props.targetBytecode < lineMap[lineno + 1]
    && !props.expand && props.mode === "l"
  ) lineClassName += " em";
  return (
    <div
     className={lineGroupClassName}
     data-lid={lineno}
     onClick={props.handlers.expandToggleLive}
    >
      <div className={lineClassName}>
        <div className="code-linecell gutter">{lineno + lineDefined}</div>
        <div className="code-linecell">{
          styledText(
            props.sourceLines[lineno + lineDefined - 1],
            props.sourceLinesSyntaxHighlighted &&
            props.sourceLinesSyntaxHighlighted[lineno + lineDefined - 1]
          )
        }<SlugOverlay decoration={props.decoration}/>
        </div>
      </div>
      {props.expand || props.mode === "m" ?
       <BytecodeLineRange
        handlers={props.handlers}
        rangeBegin={lineMap[lineno]} rangeEnd={lineMap[lineno + 1]}
        proto={props.proto}
        targetBytecode={props.targetBytecode}
        decoration={props.bytecodeDecoration}
       /> : null
      }
    </div>
  );
}

function styledText(plain, styled) {
  return styled ? <span dangerouslySetInnerHTML={styled}/> : plain;
}

function BytecodeLineRange(props) {
  const rangeBegin = props.rangeBegin, rangeEnd = props.rangeEnd;
  const targetBytecode = props.targetBytecode;
  const lines = [];
  for (let i = rangeBegin; i < rangeEnd; ++i) {
    lines.push(
      <BytecodeLine
       key={i}
       handlers={props.handlers}
       lineno={i}
       proto={props.proto}
       targetBytecode={targetBytecode === i ? i : -1}
       decoration={props.decoration && props.decoration[i]}
      />
    );
  }
  return lines;
}

function BytecodeLine(props) {
  let className = "code-line bytecode";
  if (props.decoration)
    className += " " + props.decoration.className;
  if (props.lineno === props.targetBytecode) className += " em";
  return (
    <div
     className={className} data-bid={props.lineno}
     onMouseEnter={props.handlers.bytecodeLineHover}
     onMouseLeave={props.handlers.bytecodeLineUnhover}
    >
      <div className="code-linecell gutter">{number4(props.lineno)}</div>
      <div className="code-linecell">
        <span
         dangerouslySetInnerHTML={{
            __html: hljs.highlight("lua", props.proto.bc[props.lineno]).value
         }}
        />
        <SlugOverlay decoration={props.decoration}/>
      </div>
    </div>
  );
}

function SlugOverlay(props) {
  const decoration = props.decoration;
  if (!decoration || decoration.slugs.length === 0)
    return null;
  return (
    <span className="slugs-overlay">{
      decoration.slugs.map((slug, index) => (
        <span key={index} className="slug">{slug}</span>
      ))
    }</span>
  );
}
