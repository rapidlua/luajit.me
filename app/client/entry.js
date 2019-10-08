import {debounce} from "./debounce";

import React from "react";
import {render} from "react-dom";

import {importData} from "./importData.js";
import {targets} from "../server/targets.js";
import {InspectorPanel} from "./InspectorPanel.js"; 
import {ProgressIndicator} from "./ProgressIndicator.js";
import {ToolbarHoverTrigger} from "./Toolbar.js";
import {EditorOverlay} from "./EditorOverlay.js";

import * as Action from "./Action.js";

import "./styles.css";

const SELECTION_AUTO = 'selection-auto';

function initial() {
  const state = {
    response: { prototypes: [], traces: [] },
    selection: SELECTION_AUTO,
    _input: {
      text: require("./snippets/help.lua"),
      target: targets[targets.length - 1]
    },
    enablePmode: false,
    showTopPanel: false,
    enableFilter: true,
    mode: "lua",
    protoMode: "info",
    traceMode: "info"
  };
  return Action.apply(
    state, Action.windowResize(
      document.documentElement.clientWidth,
      document.documentElement.clientHeight
    )
  );
}

class App extends React.Component {
  state = initial();
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
    this.dispatch(Action.windowResize(
      document.documentElement.clientWidth,
      document.documentElement.clientHeight
    ));
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
      this.dispatch(
        Action.paneVisibilityToggle("inspectorPanel.paneLayout", "tracePane")
      );
    if (e.keyCode == 50 /* 2 */)
      this.dispatch(
        Action.paneVisibilityToggle("inspectorPanel.paneLayout", "detailsPane")
      );
    if (e.keyCode == 66 /* B */)
      this.setState({
        mode: this.state.mode != "luabc" ? "luabc" : "lua"
      });
    if (e.keyCode == 70 /* F */)
      this.toggleOption(e, "enableFilter");
    if (e.keyCode == 76 /* L */)
      this.setState({ mode: "lua" });
    if (e.keyCode == 77 /* M */)
      this.setState({ mode: "mixed" });
    if (e.keyCode == 80 /* P */)
      this.toggleOption(e, "enablePmode");
    if (e.keyCode == 82 /* R */)
      this.dispatch(Action.inputPropertySet({}));
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
  render () {
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
          <InspectorPanel state={this.state} dispatch={this.dispatch}/>
        </div>
      </div>
    );
  }
}

render(<App/>, document.getElementById('app'));
