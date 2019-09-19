import React from "react";
import "./AppPanel.css";

export class AppPanel extends React.Component {
  handleMouseDown = (e) => {
    const parentNode = e.target.parentNode;
    const panelRect = parentNode.getBoundingClientRect();
    this.dragStartX = e.clientX;
    this.dragDir = (
      e.clientX < panelRect.left + panelRect.width/2 ? -1 : +1
    );
    this.resizee = parentNode;
    this.initialWidth = panelRect.width;
    let overlay = this.overlay;
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.setAttribute(
        "style",
        `position: absolute;
           top: 0;
           bottom: 0;
           left: 0;
           right: 0;
           z-index: 10000;
           cursor: col-resize;`
      );
      overlay.addEventListener("mousemove", this.handleMouseMove);
      this.overlay = overlay;
    }
    document.getElementById("app").append(overlay);
    window.addEventListener("mouseup", this.handleMouseUp);
    e.preventDefault();
    e.stopPropagation();
  }
  computeWidth(e) {
    const delta = this.dragDir*(e.clientX - this.dragStartX);
    const width = this.initialWidth + delta;
    return Math.min(400, width > 200 ? width : 0);
  }
  handleMouseUp = (e) => {
    window.removeEventListener("mouseup", this.handleMouseUp);
    const overlay = this.overlay;
    if (overlay) overlay.remove();
    const setPanelWidth = this.props.setPanelWidth;
    if (setPanelWidth) setPanelWidth(this.computeWidth(e));
  }
  handleMouseMove = (e) => {
    const delta = this.dragDir*(e.clientX - this.dragStartX);
    this.resizee.setAttribute("style", "width: " + this.computeWidth(e) + "px;");
  }
  render() {
    const content   = this.props.content;
    const noContent = !content || Array.isArray(content) && content.length == 0;
    return (
      <div
        className={this.props.className}
        style={{width:(this.props.panelWidth || 300)+"px"}}
      >
        {this.props.toolbar}
        <div className="content-host" onClick={this.props.contentOnClick}>
        {
          noContent ?
          <div className="content-placeholder">
            {this.props.placeholder || "No Data"}
          </div> :
          <div className="content-area">{content}</div>
        }
        </div>
        <div
            className="pane-resizer"
            onMouseDown={this.handleMouseDown}
        />
      </div>
    )
  }
}
