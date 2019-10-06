import "./Placeholder.css";

export function Placeholder(props) {
  return (
    <div className={"placeholder " + (props.className || "")}
    >{props.children}</div>
  );
}
