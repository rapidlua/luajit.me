import {ToggleButton} from "./ToggleButton.js";

export function ModeSwitcher(props) {
  const currentMode = props.currentMode;
  const selectMode = props.selectMode;
  return (
    <div className="toolbar-group toolbar-em">{
      props.modes.map((mode) => (
        <ToggleButton
          key     = {mode.key}
          isOn    = {currentMode == mode.key}
          onClick = {(e)=>selectMode(e, mode.key)}
          label   = {mode.label || mode.name}
        />
      ))
    }</div>
  );
}
