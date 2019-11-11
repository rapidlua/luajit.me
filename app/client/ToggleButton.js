import "./ToolbarButton.css";
import "./ToggleButton.css"

export function ToggleButton(props) {
  const { children, className, isOn, ...otherProps } = props;
  return (
    <span
     className={"toolbar-btn toolbar-sw-" + (isOn ? "on" : "off")}
     {...otherProps}
    >{
      children
    }</span>
  );
}
