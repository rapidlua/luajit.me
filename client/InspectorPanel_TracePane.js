import {debounce} from "./debounce.js";
import * as gv from "./gv.js";
import * as Action from "./Action.js";
import React from "react";
import {ModeSwitcher, Mode} from "./ModeSwitcher.js";
import {Icon} from "./Icon.js";
import {ScrollView} from "./ScrollView.js";
import {ToggleButton} from "./ToolbarButton.js";
import {Placeholder} from "./Placeholder.js";
import {getSelection, getObjects} from "./processing.js";

import "./InspectorPanel_TracePane.css";

function createDot(objects) {
  let dot = [
    "digraph{ranksep=.32;edge[arrowsize=.9]",
    ";node[shape=circle,margin=.007,height=.41,width=0]"
  ];
  const edgesCount = new Array(objects.length);
  edgesCount.fill(0);
  objects.forEach((object, index) => {
    if ((object.type === "trace" || object.type === "trace.abort")
      && object.id === index
    ) {
      if (object.link !== undefined) ++edgesCount[object.link];
      if (object.parent !== undefined) ++edgesCount[object.link];
    }
  });
  objects.forEach((object, index) => {
    if ((object.type === "trace" || object.type === "trace.abort")
      && object.id === index
    ) {
      dot.push(";" + index + "[label=" + object.name + (
        object.parent === undefined ? ",shape=doublecircle" : ""
      ) + "]");
      // to declutter the drawing, output a single bi-directional edge iff:
      //  * the trace links back to its parent
      //  * the parent connection is not a stitch
      //  * the number of outgoing and incoming edges in either the trace
      //    or its parent is "high"
      // (still, two separate edges look better)
      if (object.link !== undefined &&
          object.link === object.parent &&
          (objects[object.parent].info.linktype !== "stitch"
            || object.parentexit > -1) &&
          (edgesCount[object.parent] > 3 || edgesCount[index] > 3)
      ) {
        dot.push(";" + object.parent + "->" + index + "[dir=both]");
      } else {
        if (object.link !== undefined)
          dot.push(";" + index + "->" + object.link);
        if (object.parent !== undefined)
          dot.push(";" + object.parent + "->" + index);
      }
    }
  });
  dot.push("}");
  if (dot.length === 3) return;
  return dot.join("");
}

class TraceBrowser extends React.PureComponent {
  state = {graph: null};
  componentDidMount() {
    const updateGraph = (objects) => {
      const dot = createDot(objects);
      if (!dot) {
        this.setState({graph: null});
        return;
      }
      gv.renderJSON(
        dot, (error, result) => {
          if (objects !== this.props.objects) return;
          if (error) {
            this.setState({graph: null});
            console.error(error);
            return;
          }
          this.setState({ graph: result, objects });
      });
    }
    updateGraph(this.props.objects);
    const updateGraphDebounced = debounce((objects) => {
      if (!objects) return;
      if (!updateGraphDebounced.isPending) updateGraphDebounced();
      updateGraph(objects);
    }, 250);
    this.componentWillUnmount = () => updateGraphDebounced.clear();
    this.componentDidUpdate = (prevProps) => {
      if (this.props.objects === prevProps.objects) return;
      if (updateGraphDebounced.isPending)
        updateGraphDebounced(this.props.objects);
      else {
        updateGraph(this.props.objects);
        updateGraphDebounced();
      }
    }
  }
  handleClick = (e) => {
    e.stopPropagation();
    this.props.dispatch(
      Action.propertySet({
        selection: +e.currentTarget.getAttribute("data-id")
      })
    );
  }
  handleMouseOver = (e) => {
    this.props.dispatch(
      Action.propertySet({
        transientSelection: +e.currentTarget.getAttribute("data-id")
      })
    );
  }
  handleMouseOut = (e) => {
    this.props.dispatch(
      Action.propertySet({ transientSelection: undefined })
    );
  }
  render() {
    const graph = this.state.graph;
    if (!graph) return <Placeholder>No Traces</Placeholder>;
    const objects = this.state.objects;
    const selection = this.props.selection;
    const [width, height] = gv.jsonGetExtents(graph);
    const swapAxes = width > 250 && height < width || height < 250 && width < height;
    const arrowHeadStyle = {stroke:null};
    const labelStyle = {fontFamily:null, fontSize:null};
    return (
        <svg {...gv.jsonGetSVGAttrs(graph, {units:"px", swapAxes})}>
          <g transform={swapAxes ? "matrix(0,1,1,0,0,0)" : null}>
          {
            (graph.objects||[]).map(node => {
              const innerHTML = [];
              const render = gv.jsonCreateSVGRenderer(innerHTML);
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
              if (this.props.selection === +node.name) className += " active";
              if (objects[+node.name].type === "trace.abort")
                className += " error";
              return (
                <g
                  key={node.name}
                  className={className}
                  data-id={node.name}
                  onClick={this.handleClick}
                  onMouseOver={this.handleMouseOver}
                  onMouseOut={this.handleMouseOut}
                  dangerouslySetInnerHTML={{__html: innerHTML.join("")}}
                />
              );
            })
          }
          {
            (graph.edges||[]).map((edge, index)=>{
              const innerHTML = [];
              const render = gv.jsonCreateSVGRenderer(innerHTML);
              if (edge._draw_) edge._draw_.forEach(render);
              if (edge._hdraw_)
                edge._hdraw_.forEach(cmd=>render(cmd, arrowHeadStyle));
              if (edge._tdraw_)
                edge._tdraw_.forEach(cmd=>render(cmd, arrowHeadStyle));
              let className = "g-trace-link";
              const tail = objects[+graph.objects[edge.tail].name];
              const head = objects[+graph.objects[edge.head].name];
              if (tail.info.linktype === "stitch" && !(head.parentexit > -1))
                className += " stitch";
              return (
                <g
                  key={index}
                  className={className}
                  dangerouslySetInnerHTML={{__html: innerHTML.join("")}}
                />
              );
            })
          }
          </g>
        </svg>
    );
  }
}

export class TraceToolbar extends React.Component {
  toggleFilter = () => this.props.dispatch(
    Action.propertyToggle("inspectorPanel.protoFilter")
  );
  render() {
    const filterOn = this.props.state["inspectorPanel.protoFilter"];
    return (
      <React.Fragment>
        <ModeSwitcher {...this.props}><Mode>Traces</Mode></ModeSwitcher>
        <div className="toolbar-group right">
          <ToggleButton
            tooltip = {
              filterOn ?
              "Disable prototype filter" :
              "Enable filter: prototypes in active trace"
            }
            isOn    = {filterOn}
            onClick = {this.toggleFilter}
          ><Icon id="filter"/></ToggleButton>
        </div>
      </React.Fragment>
    );
  }
}

export class TracePane extends React.PureComponent {
  clearSelection = () => this.props.dispatch(
    Action.propertySet({ selection: -1 })
  );
  render() {
    const objects = getObjects(this.props.state);
    const selection = getSelection(this.props.state);
    return (
      <ScrollView className="g-wrapper" onClick={this.clearSelection}>
        <TraceBrowser
         objects={objects}
         selection={objects[selection] && objects[selection].id || selection}
         dispatch={this.props.dispatch}
        />
      </ScrollView>
    );
  }
}
