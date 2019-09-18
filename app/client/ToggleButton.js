import "./ToolbarButton.css";
import "./ToggleButton.css"

export function ToggleButton(props) {
	return (
		<span
			className={"toolbar-btn toolbar-sw-" + (props.isOn ? "on" : "off")}
			onClick={props.onClick}
		>{
			props.label
		}</span>
	);
}
