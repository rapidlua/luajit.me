import React from "react";
import "./AppPanel.css";
import {ScrollView} from "./ScrollView.js"

export function AppPanel(props) {
  const content   = props.content;
  const noContent = !content || Array.isArray(content) && content.length == 0;
  return (
    <div
      className={props.className}
      style={{width:(props.panelWidth || 300)+"px"}}
    >
      {props.toolbar}
      <ScrollView onClick={props.contentOnClick}>
      {
        noContent ?
        <div className="content-placeholder">
          {props.placeholder || "No Data"}
        </div> : content
      }
      </ScrollView>
    </div>
  )
}
