import React from "react";
import {PaneDivider} from "./PaneDivider.js";
import {InspectorToolbar} from "./InspectorPanel.js";
import {CmdButton} from "./ToolbarButton.js";
import {Icon} from "./Icon.js";
import {
  Button, UncontrolledButtonDropdown, DropdownMenu,
  DropdownItem, DropdownToggle
} from "reactstrap";

import * as Action from "./Action.js";

import "./Toolbar.css";
import "./PaneLayout.css";
import "./ControlPanel.css";

export class ControlPanel extends React.PureComponent {
  state = { hover: false }
  toolbarRef = React.createRef();
  componentWillUnmount() {
    document.removeEventListener("mousemove", this.handleMouseMove);
  }
  componentDidUpdate() {
    // not 100% bullet-proof, but working for our current use case:
    //   * the mouse pointer is on top of a toolbar's decendant;
    //   * hence handleHover was executed for the toolbar;
    //   * now due to a state change this intermediary element is
    //     removed from the DOM tree and the mouse pointer is no longer
    //     on top of the toolbar or it's descendant;
    //   * mouse leave event not reported and toolbar is stuck!
    // This scenario is excercised when 'Enter presentation mode' is
    // requested from the dropdown menu.
    if (this.state.hover && this.toolbarRef.current) {
      if (!this.toolbarRef.current.contains(
        document.elementFromPoint(this.mouseX, this.mouseY)
      )) this.handleUnhover();
    }
  }
  handleHover = (e) => {
    this.setState({ hover: true });
    document.addEventListener("mousemove", this.handleMouseMove);
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
  }
  handleUnhover = () => {
    this.setState({ hover: false });
    document.removeEventListener("mousemove", this.handleMouseMove);
  }
  handleMouseMove = (e) => {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
  }
  handleTextChange = (e) => {
    this.props.dispatch(Action.inputPropertySet({
      text: e.target.value, _delay: true
    }));
  }
  render() {
    const pmode = this.props.state["root.presentationMode"];
    const style = {};
    if (pmode) style.height = "16px";
    return (
      <div
       className="control-panel" style={style} ref={this.toolbarRef}
       onMouseEnter={this.handleHover} onMouseLeave={this.handleUnhover}
      >
        { pmode && !this.state.hover ? null : <ToolbarArea {...this.props}/> }
      </div>
    );
  }
}

function ToolbarArea(props) {
  const layout = props.state["root.paneLayout"];
  return (
    <div className="toolbar-area">
      <div className="toolbar primary">
        <div className="toolbar-group left">
          <EditButton {...props}/>
          <CmdButton><Icon id="share"/> Share</CmdButton>
          <CmdButton>About</CmdButton>
        </div>
      </div>
      <InspectorToolbar {...props}/>
      <PaneDivider
       type="h" layoutId="root.paneLayout"
       paneSize={layout.inlineEditorIsVisible ? layout.inlineEditorHeight : 0}
       paneId="inlineEditor" dispatch={props.dispatch}
      />
    </div>
  );
}

class EditButton extends React.PureComponent {
  spawnEditor = () => this.props.dispatch(
    Action.propertySet({ _showEditorOverlay: true })
  );
  doRefresh = () => this.props.dispatch(
    Action.inputPropertySet({})
  );
  toggleInlineEditor = () => this.props.dispatch(
    Action.paneVisibilityToggle("root.paneLayout", "inlineEditor")
  );
  togglePresentationMode = () => this.props.dispatch(
    Action.propertyToggle("root.presentationMode")
  );
  render() {
    const layout = this.props.state["root.paneLayout"];
    const presentationMode = this.props.state["root.presentationMode"];
    return (
      <UncontrolledButtonDropdown>
        <Button id="caret" color="primary" onClick={this.spawnEditor}>Edit</Button>
        <DropdownToggle caret color="primary"/>
        <DropdownMenu>
          <DropdownItem onClick={this.doRefresh}>
            <Icon id="refresh"/> Refresh
          </DropdownItem>
          <DropdownItem
           onClick={this.toggleInlineEditor}
           disabled={!layout.inlineEditorIsVisible && !layout._inlineEditorCanShow}
          >
            <Icon id="blank"/> {
              layout.inlineEditorIsVisible ? "Hide inline editor" : "Show inline editor"
            }
          </DropdownItem>
          <DropdownItem onClick={this.togglePresentationMode}>
            <Icon id="blank"/> {
              presentationMode ? "Leave presentation mode" : "Enter presentation mode"
            }
          </DropdownItem>
        </DropdownMenu>
      </UncontrolledButtonDropdown>
    );
  }
}
