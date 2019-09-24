import {debounce} from "./debounce.js";
import React from "react";
import {AppPanel} from "./AppPanel.js";
import {
  gvRenderJSON, gvJSONGetExtents, gvJSONGetSVGAttrs,
  gvJSONCreateSVGRenderer
} from "./gv.js";

import "./TraceBrowserPanel.css";

function createDot(traces) {
  let dot = "digraph{ranksep=.32;edge[arrowsize=.9];node[shape=circle,margin=.007,height=.41,width=0]";
  // do nodes
  traces.forEach((trace) => {
    if (trace) {
      dot = dot + ";" + trace.index + "[id=" + trace.id + (
        trace.info.parent === undefined ? ",shape=doublecircle" : ""
      ) + "]";
    }
  });
  // do edges
  traces.forEach((trace) => {
    if (trace) {
      const info = trace.info;
      // if the trace links back to its parent, output
      // single bi-directional edge, unless the total
      // number of nodes is low (2 separate edges look better) or
      // if link types are different
      if (traces.length > 3 && info.link !== undefined &&
          info.link == info.parent &&
          traces[info.parent].info.linktype != "stitch")
      {
        dot = dot + ";" + info.parent + "->" + trace.index + (
          "[id=\"T"+info.parent + ":"+trace.id+"\", dir=both]"
        );
      } else {
        if (info.link !== undefined) {
          dot = dot + ";" + trace.index + "->" + info.link + (
            "[id=\""+trace.id + ":T"+info.link+"\"]"
          );
        }
        if (info.parent !== undefined) {
          dot = dot + ";" + info.parent + "->" + trace.index + (
            "[id=\"T"+info.parent + ":"+trace.id+"\"]"
          );
        }
      }
    }
  });
  return dot + "}";
}

export class TraceBrowserPanel extends React.PureComponent {
  state = {graph: null};
  componentDidMount() {
    const updateGraph = (traceList) => {
      if (!traceList) return;
      if (!traceList.length) {
        this.setState({graph: null});
        return;
      }
      gvRenderJSON(
        createDot(traceList), (error, result) => {
          if (traceList !== this.props.data) return;
          if (error) {
            this.setState({graph: null});
            console.error(error);
            return;
          }
          this.setState({graph: result});
      });
    }
    updateGraph(this.props.data);
    const updateGraphDebounced = debounce(updateGraph, 250);
    this.componentWillUnmount = () => updateGraphDebounced.clear();
    this.componentDidUpdate = (prevProps) => {
      if (this.props.data === prevProps.data) return;
      if (updateGraphDebounced.isPending)
        updateGraphDebounced(this.props.data);
      else {
        updateGraph(this.props.data);
        updateGraphDebounced();
      }
    }
  }
  handleClick = (e) => {
    this.props.selectItem(e, e.currentTarget.getAttribute("data-trace-id"));
  }
  handleMouseOver = (e) => {
    this.props.selectTransient(e, e.currentTarget.getAttribute("data-trace-id"));
  }
  handleMouseOut = (e) => {
    this.props.selectTransient(e, null);
  }
  render() {
    const data = this.props.data;
    const graph = this.state.graph;
    const selection = this.props.selection;
    let content;
    if (graph) {
      const [width, height] = gvJSONGetExtents(graph);
      const swapAxes = width > 250 && height < width || height < 250 && width < height;
      const arrowHeadStyle = {stroke:null};
      const labelStyle = {fontFamily:null, fontSize:null};
      content = (
        <div className="g-wrapper">
          <svg {...gvJSONGetSVGAttrs(graph, {units:"px", swapAxes})}>
            <g transform={swapAxes ? "matrix(0,1,1,0,0,0)" : null}>
            {
              (graph.objects||[]).map(node=>{
                const innerHTML = [];
                const render = gvJSONCreateSVGRenderer(innerHTML);
                node._draw_.filter(cmd=>cmd.op==="e").forEach((cmd,index)=>{
                  const [x,y,w,h] = cmd.rect;
                  innerHTML.push(
                    '<ellipse class="', ["g-ring", "g-outter-ring"][index],
                    '" cx="', x, '" cy="', y, '" rx="', w, '" ry="', h, '"/>'
                  );
                  if (swapAxes)
                    labelStyle.transform = "matrix(0,1,1,0,"+(x-y)+","+(y-x)+")";
                });
                if (node._ldraw_)
                  node._ldraw_.forEach(cmd=>render(cmd, labelStyle));
                let className = "g-trace-thumb";
                if (this.props.selection===node.id) className += " active";
                const trace = data[+node.id.substr(1)];
                if (trace && trace.info.error) className += " error";
                return (
                  <g
                   key={node.id}
                   className={className}
                   data-trace-id={node.id}
                   onClick={this.handleClick}
                   onMouseOver={this.handleMouseOver}
                   onMouseOut={this.handleMouseOut}
                   dangerouslySetInnerHTML={{__html: innerHTML.join("")}}
                  />
                );
              })
            }
            {
              (graph.edges||[]).map(edge=>{
                const innerHTML = [];
                const render = gvJSONCreateSVGRenderer(innerHTML);
                if (edge._draw_) edge._draw_.forEach(render);
                if (edge._hdraw_) edge._hdraw_.forEach(cmd=>render(cmd, arrowHeadStyle));
                if (edge._tdraw_) edge._tdraw_.forEach(cmd=>render(cmd, arrowHeadStyle));
                let className = "g-trace-link";
                const initiator = data[edge.id.substr(1).split(":")[0]];
                if (initiator && initiator.info.linktype==="stitch") className += " stitch";
                return (
                  <g
                   key={edge.id}
                   className={className}
                   dangerouslySetInnerHTML={{__html: innerHTML.join("")}}
                  />
                );
              })
            }
            </g>
          </svg>
        </div>
      );
    }
    return (
      <AppPanel
        className="left-pane"
        toolbar={this.props.toolbar}
        content={content}
        contentOnClick={this.props.selectItem}
        placeholder="No Traces"
        panelWidth={this.props.panelWidth}
        setPanelWidth={this.props.setPanelWidth}
      />
    );
  }
}
