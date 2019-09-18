import {debounce} from "debounce";
import memoizeOne from "memoize-one";
import React from "react";
import {AppPanel} from "./AppPanel.js";
import {
  gvRenderJSON, gvJSONGetExtents, gvJSONGetSVGAttrs,
  gvJSONCreateSVGRenderer
} from "./gv.js";

import "./TraceBrowserPanel.css";

function createDot(traces, topple) {
  let dot = "digraph{ranksep=.32;edge[arrowsize=.9];node[shape=circle,margin=.007,height=.41,width=0]";
  if (topple) {
    dot += ";rankdir=LR";
    traces = traces.slice().reverse();
  }
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
  updateGraph = memoizeOne(debounce((() => {
    let topple = false;
    return (traceList) => gvRenderJSON(
      createDot(traceList, topple), (error, result) => {
        if (traceList !== this.props.data) return;
        if (error) {
          this.setState({graph: null});
          console.error(error);
          return;
        }
        const [width, height] = gvJSONGetExtents(result);
        if (width < height + 60)
          this.setState({graph: result});
        else
          gvRenderJSON(
            createDot(traceList, !topple), (error, result2) => {
              if (traceList !== this.props.data) return;
              if (error) {
                this.setState({graph: null});
                console.error(error);
                return;
              }
              const [width2] = gvJSONGetExtents(result2);
              this.setState({
                graph: width < width2 ? result : (topple = !topple, result2)
              });
          });
    });
  })(), 250, true));
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
    const dotJSON = data.length ? (this.updateGraph(data), this.state.graph) : null;
    const selection = this.props.selection;
    const handleClick = this.handleClick;
    const handleMouseOver = this.handleMouseOver;
    const handleMouseOut = this.handleMouseOut;
    let content;
    if (dotJSON) {
      const noStroke = {stroke:null};
      const noFontStyles = {fontFamily:null, fontSize:null};
      content = (
        <div className="g-wrapper">
          <svg {...gvJSONGetSVGAttrs(dotJSON, {units:"px"})}>
            {
              (dotJSON.objects||[]).map(node=>{
                const innerHTML = [];
                const render = gvJSONCreateSVGRenderer(innerHTML);
                node._draw_.filter(cmd=>cmd.op==="e").forEach((cmd,index)=>{
                  const [x,y,w,h] = cmd.rect;
                  innerHTML.push(
                    '<ellipse class="', ["g-ring", "g-outter-ring"][index],
                    '" cx="', x, '" cy="', y, '" rx="', w, '" ry="', h, '"/>'
                  );
                });
                if (node._ldraw_)
                  node._ldraw_.forEach(cmd=>render(cmd, noFontStyles));
                let className = "g-trace-thumb";
                if (this.props.selection===node.id) className += " active";
                const trace = data[+node.id.substr(1)];
                if (trace && trace.info.error) className += " error";
                return (
                  <g
                   key={node.id}
                   className={className}
                   data-trace-id={node.id}
                   onClick={handleClick}
                   onMouseOver={handleMouseOver}
                   onMouseOut={handleMouseOut}
                   dangerouslySetInnerHTML={{__html: innerHTML.join("")}}
                  />
                );
              })
            }
            {
              (dotJSON.edges||[]).map(edge=>{
                const innerHTML = [];
                const render = gvJSONCreateSVGRenderer(innerHTML);
                if (edge._draw_) edge._draw_.forEach(render);
                if (edge._hdraw_) edge._hdraw_.forEach(cmd=>render(cmd, noStroke));
                if (edge._tdraw_) edge._tdraw_.forEach(cmd=>render(cmd, noStroke));
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
