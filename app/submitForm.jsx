import React from "react";
import {render} from "react-dom";

export class SubmitForm extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      // Safari quirk: leading spaces ignoted in a textarea
      // with white-space: nowrap style (\u00a0 is a non-breaking space)
      input: "local sum = 1\nfor i = 2,10000 do\n\u00a0\u00a0sum = sum + i\nend",
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
    var plaque;
    if (this.state.error != null)
      plaque = <div className="alert alert-danger" role="alert">
          <strong>Something wrong!</strong> {this.state.error}
      </div>
    else
      plaque = '';
    var numLines = Math.min(30,
      Math.max(5, this.state.input.split(/\n/).length));
    return (
      <form onSubmit={this.handleSubmit.bind(this)}>
        <div className="plaque-wrapper">{plaque}</div>
        <div className="form-group">
          <textarea
            rows={numLines} onChange={this.handleTextChange.bind(this)}
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
