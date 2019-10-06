import React from "react";
import "./ScrollView.css";

export function ScrollView(props) {
  const {ignored, ...childProps} = props;
  return <div className="scroll-view"><div {...childProps}/></div>;
}
