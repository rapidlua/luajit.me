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
  const paneDivider = (
    <PaneDivider
     type="h" layoutId="root.paneLayout"
     paneSize={layout.inlineEditorIsVisible ? layout.inlineEditorHeight : 0}
     paneId="inlineEditor" dispatch={props.dispatch}
    />
  );
  return (
    <div className="toolbar-area">
      {paneDivider}
      <div className="toolbar primary">
        <div className="toolbar-group left">
          <EditButton {...props}/>
          <CmdButton><Icon id="share"/> Share</CmdButton>
          <CmdButton>About</CmdButton>
        </div>
        <div className="toolbar-group right">
          <TargetPicker
           dispatch={props.dispatch}
           target={props.state._input.target}
          />
        </div>
      </div>
      <InspectorToolbar {...props}/>
      {paneDivider}
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
    // Note cp-size: custom size defined in our Bootstrap buid to match
    // other control panel controls
    return (
      <UncontrolledButtonDropdown size="cp-size" id="cp-edit-btn">
        <Button color="primary" size="cp-size"
         onClick={this.spawnEditor}
        >{layout.inlineEditorIsVisible ? "Samples" : "Edit"}</Button>
        <DropdownToggle split color="primary" size="cp-size"/>
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

import {engines, targets} from "../server/targets.js";

class TargetPicker extends React.PureComponent {
  setTarget = (e) => {
    const id = e.currentTarget.getAttribute("data-id");
    const target = { id: targets[id].id, name: targets[id].name };
    this.props.dispatch(Action.inputPropertySet({ target }));
  };
  render() {
    return (
      <UncontrolledButtonDropdown size="cp-size" id="cp-target-picker">
        <DropdownToggle caret size="cp-size" color="cp-color">
          {this.props.target.name}
        </DropdownToggle>
        <DropdownMenu>{engines.map((engine, index) => (
          <React.Fragment key={index}>
            { index ? <DropdownItem separator/> : null }
            { engine.versions.map((ver, i) => (
                <DropdownItem
                 key={i} active={ver.id === this.props.target.id}
                 data-id={ver.id} onClick={this.setTarget}
                >
                  {engine.name} {ver.name}
                </DropdownItem>
            ))}
          </React.Fragment>
        ))}</DropdownMenu>
      </UncontrolledButtonDropdown>
    );
  }
}
