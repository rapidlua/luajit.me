import React from "react";
import {render} from "react-dom";

export class PropListItem extends React.Component {
  render() {
    return (
      <div className="prop-list-item">
        <div className="prop-list-item-label">{this.props.label}</div>
        <div className="prop-list-item-value">{this.props.value}</div>
      </div>
    );
  }
}

export class PropListView extends React.Component {
  render() {
    var data = this.props.data;
    var schema = this.props.schema;
    var content = [];
    if (schema) {
      schema.forEach(function(schemaItem, i) {
        var key = schemaItem.key;
        var rawValue = data[key];
        var fmt = schemaItem.fmt;
        var value;
        if (fmt)
          value = fmt(rawValue);
        else if (rawValue!==undefined)
          value = ""+rawValue;
        if (value) {
          content.push(
            <PropListItem
              key={key}
              value={value}
              label={schemaItem.label || key}
            />
          );
        }
      });
    } else for (var key in data) {
      if (data.hasOwnProperty(key)) {
        content.push(
          <PropListItem
            key={key}
            value={""+data[key]}
            label={key}
          />
        );
      }
    }
    return (
      <div className="prop-list-view">{content}</div>
    );
  }
}
