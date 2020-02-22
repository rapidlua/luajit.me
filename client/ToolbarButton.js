import "./ToolbarButton.css";
import React from "react";
import { UncontrolledTooltip } from "reactstrap";

export class Button extends React.PureComponent {
  btnRef = React.createRef();
  render() {
    const { className, tooltip, ...otherProps } = this.props;
    const classes = ["toolbar-btn"];
    if (className) classes.push(className);
    return (
      <React.Fragment>
        <div ref={this.btnRef}
         className={classes.join(" ")} {...otherProps}
        />
        { tooltip && this.btnRef.current ?
          <UncontrolledTooltip
           target={this.btnRef.current}
           placement="bottom"
           trigger="click hover focus"
          >{tooltip}</UncontrolledTooltip> : null
        }
      </React.Fragment>
    );
  }
  componentDidMount() {
    if (this.props.tooltip) this.forceUpdate();
  }
}

export function CmdButton(props) {
  const { className, ...otherProps } = props;
  const classes = ["cmd"];
  if (className) classes.push(className);
  return <Button className={classes.join(" ")} {...otherProps}/>;
}

export function ToggleButton(props) {
  const { className, isOn, ...otherProps } = props;
  const classes = ["toggle"];
  if (isOn) classes.push("on");
  if (className) classes.push(className);
  return <Button className={classes.join(" ")} {...otherProps}/>;
}
