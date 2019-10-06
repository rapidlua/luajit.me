import React from "react";
import "./ProgressIndicator.css";

export class ProgressIndicator extends React.PureComponent {
  state = { indicatorState: "hidden", activity: null };
  static getDerivedStateFromProps(props, state) {
    const activity = props.activity;
    return {
      activity,
      indicatorState: activity === state.activity ? state.indicatorState :
        (activity ? "starting" : "finishing")
    };
  }
  render() {
    return (
      <div className={"progress-indicator " + this.state.indicatorState}/>
    );
  }
  transition(indicatorState) {
    const expected = this.state.indicatorState;
    return () => {
      this.setState((state) =>
        state.indicatorState !== expected ? state
        : Object.assign({}, state, { indicatorState })
      )
    };
  }
  componentDidUpdate() {
    switch (this.state.indicatorState) {
    case "starting":
      requestAnimationFrame(this.transition("running"));
      break;
    case "finishing":
      setTimeout(this.transition("hidden"), 150);
      break;
    }
  }
}
