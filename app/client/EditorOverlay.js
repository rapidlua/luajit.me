import * as Action from "./Action.js";
import React from "react";
import "./EditorOverlay.css";

const octocat_svg = require("raw-loader!./octocat.svg");

function GithubUrl() {
  return (
    <a
     className="github-url"
     href="https://github.com/rapidlua/luajit.me"
    >
      <div dangerouslySetInnerHTML={{ __html: octocat_svg }}/>
      <div className="speach-bubble">★ me on GitHub!</div>
    </a>
  );
}

const snippets = [
  { label: "blank",      text: "" },
  { label: "loops",      text: require("./snippets/loops.lua") },
  { label: "recursion",  text: require("./snippets/recursion.lua") },
  { label: "table",      text: require("./snippets/table.lua") },
  { label: "reduce",     text: require("./snippets/reduce.lua") },
  { label: "reduce2",    text: require("./snippets/reduce2.lua") },
  { label: "fizzbuzz",   text: require("./snippets/fizzbuzz.lua") },
  { label: "mandelbrot", text: require("./snippets/mandelbrot.lua") },
  { label: "jit.off",    text: require("./snippets/jit.off.lua") },
  { label: "stitching",  text: require("./snippets/stitching.lua") },
];

function getSnippetStyle(snippet) {
  switch (snippet.label) {
  default: return "btn-warning";
  case "blank": return "btn-danger";
  }
}

class SnippetList extends React.PureComponent {
  installSnippet = (e) => {
    const snippet = snippets[
      +e.target.getAttribute("data-id")
    ];
    if (snippet)
      this.props.dispatch(Action.snippetInstall(snippet.text));
  }
  render() {
    return (
      <div className="top-btn-row">{
        snippets.map((snippet, i) => (
          <button
            key={i}
            type="button"
            className={"btn btn-sm " + getSnippetStyle(snippet)}
            data-id={i}
            onClick={this.installSnippet}
          >{snippet.label}</button>
        ))
      }</div>
    );
  }
}

function eventStopPropagation(e) {
  e.stopPropagation();
}

export class EditorOverlay extends React.PureComponent {
  handleTextChange = (e) => this.props.dispatch(
    Action.inputPropertySet({ text: e.target.value })
  )
  killEditor = (e) => this.props.dispatch(
    Action.propertySet({_showEditorOverlay: false})
  )
  render() {
    const state = this.props.state;
    if (!state._showEditorOverlay) return null;
    return (
      <div className="editor-overlay" onClick={this.killEditor}>
        <GithubUrl/>
        <div className="editor-form" onClick={eventStopPropagation}>
          <SnippetList {...this.props}/>
          <textarea
            onChange={this.handleTextChange}
            value={state._input.text}
          />
          <div className="bottom-btn-row">
            <button
              type="button" className="btn btn-primary"
              onClick={this.killEditor}
            >Apply</button>
          </div>
        </div>
      </div>
    );
  }
}
