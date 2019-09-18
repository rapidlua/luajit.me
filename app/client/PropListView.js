import "./PropListView.css";

function PropListItem(props) {
  return (
    <div className="prop-list-item">
      <div className="prop-list-item-label">{props.label}</div>
      <div className="prop-list-item-value">{props.value}</div>
    </div>
  );
}

export function PropListView(props) {
  const data = props.data;
  const schema = props.schema;
  const content = [];
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
