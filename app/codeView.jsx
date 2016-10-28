import React from "react";
import {render} from "react-dom";

export class CodeLine extends React.Component {
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
      gutter = <div className="xgutter">{this.props.lineno}</div>;
    return (
      <div
        className={this.props.className || "xcode-line"}
        data-lineno={this.props.lineno}
        onClick={this.props.onClick}
        onMouseEnter={this.props.onMouseEnter}
        onMouseLeave={this.props.onMouseLeave}
      >
        {gutter}
        <div className="xcode">{code}</div>
      </div>
    );
  }
}

export class CodeView extends React.Component {
  render() {
    var xform = this.props.xform;
    return (
      <div className={this.props.className || "xcode-view"}>
        {this.props.data.map((item, i) => (
          React.createElement(CodeLine, item, null)
        ))}
      </div>
    )
  }
}
