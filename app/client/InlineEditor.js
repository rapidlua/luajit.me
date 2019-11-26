import React from "react";
import * as Action from "./Action.js";
import "./InlineEditor.css"

export class InlineEditor extends React.PureComponent {
  handleTextChange = (e) => {
    this.props.dispatch(Action.inputPropertySet({
      text: e.target.value, _delay: true
    }));
  }
	render() {
		const layout = this.props.state["root.paneLayout"];
		if (!layout.inlineEditorIsVisible) return null;
		return (
			<div
			 className="inline-editor"
			 style={{ height: layout.inlineEditorHeight + "px"}}
			>
				<textarea
					rows="5" onChange={this.handleTextChange}
					value={this.props.state._input.text}
				/>
			</div>
		);
	}
}
