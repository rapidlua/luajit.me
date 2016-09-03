import React from "react";
import {render} from "react-dom";

class SubmitForm extends React.Component {
  constructor(props) {
    super(props)
    this.state = {input: "local sum = 0\nfor i = 1,10000 do\n  sum = sum + i\nend", error: null}
  }
  handleTextChange(e) {
    var text = e.target.firstChild.data;
    this.setState({input: e.target.value})
  }
  handleClear() {
    this.setState({input: "", error: null, elapsed: null})
    this.props.replaceData({})
  }
  handleSubmit(e) {
    e.preventDefault();
    $.ajax({
      type: "POST",
      url: "/run",
      dataType: "json",
      async: true,
      data: JSON.stringify({source:this.state.input}),
      success: function(response) {
        console.log(response)
        this.setState({
          input: this.state.input,
          error: response.error || null,
          elapsed: response.elapsed_time || null
        })
        this.props.replaceData(response)
      }.bind(this),
      error: function(response, _, errorText) {
        var result = response.responseJson || {error: errorText}
        this.setState({
          input: this.state.input,
          error: result.error,
          elapsed: result.elapsed_time || null
        })
        this.props.replaceData(result)
      }.bind(this)
    })
  }
  render() {
    var plaque
    if (this.state.error != null)
      plaque = <div className="alert alert-danger" role="alert">
          <strong>Something wrong!</strong> {this.state.error}
      </div>
    else
      plaque = ''
    return (
      <form onSubmit={this.handleSubmit.bind(this)}>
        <div className="plaqueWrapper">{plaque}</div>
        <div className="form-group">
          <textarea
						rows="8" onChange={this.handleTextChange.bind(this)}
						value={this.state.input}
					/>
        </div>
        <div className="form-group">
          <div className="btn-toolbar">
            <button type="submit" className="btn btn-success">Run</button>
            <button
							type="button" className="btn btn-danger"
							onClick={this.handleClear.bind(this)}
						>
							Clear
						</button>
          </div>
        </div>
      </form>
    );
  }
}

class PreserveWhiteSpace extends React.Component {
		render() {
				var text = this.props.data
						.replace(/&/g, "&amp;")
				    .replace(/</g, "&lt;")
						.replace(/>/g, "&gt;")
				return <span
						style={{ whiteSpace: 'pre-wrap' }}
						dangerouslySetInnerHTML={{__html:text}}/>
		}
}

function visIndex(i) {
  var s = "0000"+i
  return s.substr(s.length-4)
}

class BytecodeLineView extends React.Component {
	render() {
		var bc = this.props.data;
		return (
      <li>
				<div className="codeWrap bc">
						<span className="gutter">{visIndex(bc.index)}</span>
						<span className={bc.id}>{bc.code}</span>
				</div>
      </li>
		);
	}
}

class SourceLineView extends React.Component {
  render() {
    var line = this.props.data
    var codes = line.codes && line.codes.map((bc, i) =>
			<BytecodeLineView key={i} data={bc}/>) || []
    return (
      <li>
        <div className="codeWrap lua">
					<span className="gutter">{line.index}</span>
						<PreserveWhiteSpace data={line.source}/>
				</div>
        <ul className="codeUl">{codes}</ul>
      </li>
    )
  }
}

class FuncProtoView extends React.Component {
  render() {
    var proto = this.props.data;
    var lineNodes = proto.lines.map((line, i) =>
      <SourceLineView data={line} key={i}/>)
    return (
      <div className="panel panel-default">
        <div className="panel-heading">
          <h3 className="panel-title">Prototype #{proto.index}</h3>
        </div>
        <div className="panel-body">
          <ul className="codeUl">{lineNodes}</ul>
        </div>
      </div>
    )
  }
}

class PrototypesView extends React.Component {
  render() {
    var protos = this.props.data.protos;
    var funcNodes = protos && protos.map(
      (proto,i) => <FuncProtoView data={proto} key={i}/>
    ) || [] 
    return <div className="toplevelCategory">{funcNodes}</div>
  }
}

class App extends React.Component {
  constructor(props) {
    super(props)
    this.state = {data: {}}
  }
  replaceData(newData) {
    var mappedData = {}
    var source = newData.source // 1-base indexing
    var protos = newData.protos
    if (protos && source) {
      mappedData.protos = protos.map(function(proto, protoIdx) {
        protoIdx = protoIdx + 1// 1-base indexing
        var sourceRange = proto.src_range
        var bcMap = proto.bc_map
        var mappedLines = []
        var i
        // leading lines without bytecode
        for (i = Math.max(1, sourceRange[0]); i<bcMap[0]; i++)
          mappedLines.push({
            index: i,
            source: source[i-1]
          });
        // process bytecodes
        proto.bc.forEach(function(bc, bcIdx) {
          bcIdx = bcIdx + 1 // 1-base indexing
          var id = 'BC'+protoIdx+':'+i
          var atLineNo = bcMap[bcIdx-1]
          var lastLine = mappedLines[mappedLines.length - 1]
          var code = {
              id: id,
              index: bcIdx,
              code: bc
          }
          if (lastLine && atLineNo && lastLine.index >= atLineNo) {
            lastLine.codes.push(code);
          } else {
            // middle lines without bytecodes
            while (atLineNo && i+1 < atLineNo) {
              mappedLines.push({
                index: i+1,
                source: source[i]
              })
              i = i+1
            }
            mappedLines.push({
              index: atLineNo,
              source: source[atLineNo - 1],
              codes: [code]
            });
          }
          if (atLineNo > i)
            i = atLineNo;
        });
        // trailing lines without bytecode
				for (; i < sourceRange[1]; i++)
          mappedLines.push({
            index: i+1,
            source: source[i]
          });
        var mappedProto = {
          id: 'P'+protoIdx,
          index: protoIdx,
          kNumber: proto.k_number,
          kGc: proto.k_gc,
          nParams: proto.n_params,
          nSlots: proto.n_slots,
          lines: mappedLines
        }
        return mappedProto
      })
    }
    this.setState({data: mappedData})
  }
  render () {
    return (
      <div>
        <div className="jumbotron">
          <SubmitForm replaceData={this.replaceData.bind(this)}/>
        </div>
        <PrototypesView data={this.state.data}/>
      </div>
    );
  }
}

render(<App/>, document.getElementById('app'));
