import "./PropListView.css";

export function PropListItem(props) {
  if (props.children === undefined) return null;
  return (
    <div className="prop-list-item">
      <div className="prop-list-item-label">{props.label}</div>
      <div className="prop-list-item-value">{props.children}</div>
    </div>
  );
}

export function PropListView(props) {
  return (
    <div className="prop-list-view">{props.children}</div>
  );
}
