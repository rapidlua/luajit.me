import React from 'react';
import './ProgressIndicator.css';

export class ProgressIndicator extends React.PureComponent {
  constructor(props) {
    super(props);
    this.transitionToRunning = this.transitionToState.bind(this, 'running');
    this.transitionToHidden = this.transitionToState.bind(this, 'hidden');
    this.state = { indicatorState: 'hidden', activity: null };
  }
  static getDerivedStateFromProps(props, state) {
    const activity = props.activity;
    return {
      activity,
      indicatorState: activity === state.activity ? state.indicatorState :
        (activity ? 'initial' : 'finishing')
    };
  }
  render() {
    let c = [''];
    switch (this.state.indicatorState) {
    case 'hidden': break;
    default:       c.push('-'+this.state.indicatorState);
    }
    return (
      <div className={c.map(ci=>'app-progress-indicator'+ci).join(' ')}/>
    );
  }
  transitionToState(indicatorState) {
    const stateExpected = this.state;
    this.setState(state => state===stateExpected ?
      Object.assign({}, state, { indicatorState }) : state
    );
  }
  componentDidUpdate() {
    switch (this.state.indicatorState) {
    case 'initial':
      requestAnimationFrame(this.transitionToRunning);
      break;
    case 'finishing':
      setTimeout(this.transitionToHidden, 150);
      break;
    }
  }
}
