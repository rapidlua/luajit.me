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

class AppMain extends React.Component {
  componentDidMount() {
    this.syncWindowSize();
    window.addEventListener("resize", this.syncWindowSize);
    document.body.addEventListener("keydown", this.handleKeyDown);
  }
  componentWillUnmount() {
    window.removeEventListener("resize", this.syncWindowSize);
    document.body.removeEventListener("keydown", this.handleKeyDown);
  }
  syncWindowSize = () => {
    this.props.dispatch(Action.windowResize(
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
    const dispatch = this.props.dispatch;
    if (e.keyCode == 13 /* Enter */)
      dispatch(Action.propertyToggle("_showEditorOverlay"));
    if (e.keyCode == 48 /* 0 */)
      dispatch(Action.propertyToggle("showTopPanel"));
    if (e.keyCode == 49 /* 1 */)
      dispatch(
        Action.paneVisibilityToggle("inspectorPanel.paneLayout", "tracePane")
      );
    if (e.keyCode == 50 /* 2 */)
      dispatch(
        Action.paneVisibilityToggle("inspectorPanel.paneLayout", "detailsPane")
      );
    if (e.keyCode == 66 /* B */)
      dispatch(Action.propertySet({
        mode: this.props.state.mode != "luabc" ? "luabc" : "lua"
      }));
    if (e.keyCode == 70 /* F */)
      dispatch(Action.propertyToggle("enableFilter"));
    if (e.keyCode == 76 /* L */)
      dispatch(Action.propertySet({ mode: "lua" }));
    if (e.keyCode == 77 /* M */)
      dispatch(Action.propertySet({ mode: "mixed" }));
    if (e.keyCode == 80 /* P */)
      dispatch(Action.propertyToggle("enablePmode"));
    if (e.keyCode == 82 /* R */)
      dispatch(Action.inputPropertySet({}));
  }
  handleTextChange = (e) => {
    this.props.dispatch(Action.inputPropertySet({
      text: e.target.value, _delay: true
    }));
  }
  render() {
    const state = this.props.state;
    return (
      <div
        className={
          "app-container" +
          (state.enablePmode ? " presentation" : "")
        }
      >
        <EditorOverlay {...this.props}/>
        {
          !state.showTopPanel ? null :
          <ToolbarHoverTrigger className="top-pane"
           dispatch={this.props.dispatch}
          >
            <textarea
              rows="5" onChange={this.handleTextChange}
              value={state._input.text}
            />
          </ToolbarHoverTrigger>
        }
        <div className="app-main">
          <InspectorPanel {...this.props}/>
        </div>
      </div>
    );
  }
};

const SELECTION_AUTO = 'selection-auto';

const initialState = {
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

function hydrateState(state) {
  state = Action.apply(state, Action.windowResize(100000, 100000));
  if (state._input === undefined)
    state._input = state.response.input;
  return state;
}

// State store + input processing initiator
// Sends input to server for processing if it no longer matches
// (last) response.
class App extends React.Component {
  static getDerivedStateFromProps(props, state) {
    if (state) return null;
    return hydrateState(props.initialState || initialState);
  }
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
    submitRequest(lastInput);

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

    this.componentWillUnmount = () => {
      submitRequestDebounced.clear();
    }
  }
  dispatch = (action) => {
    this.setState(state => {
      const result = Action.apply(state, action);
      // console.log(result);
      return result;
    });
  }
  render () {
    return (
      <React.Fragment>
        <ProgressIndicator
         activity={this.state._inputSubmitted !== this.state.response.input
           ? this.state._inputSubmitted : null
         }/>
        <AppMain state={this.state} dispatch={this.dispatch}/>
      </React.Fragment>
    );
  }
}

render(<App/>, document.getElementById('app'));
