import "./ToolbarButton.css";

export function CmdButton(props) {
  const { children, className, ...otherProps } = props;
  const classes = ["toolbar-btn cmd"];
  if (className) classes.push(className);
  return (
    <div className={classes.join(" ")} {...otherProps}>{
      children
    }</div>
  );
}

export function ToggleButton(props) {
  const { children, className, isOn, ...otherProps } = props;
  const classes = ["toolbar-btn toggle"];
  if (isOn) classes.push("on");
  if (className) classes.push(className);
  return (
    <div className={classes.join(" ")} {...otherProps}>{
      children
    }</div>
  );
}
