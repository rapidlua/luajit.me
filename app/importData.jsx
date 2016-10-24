function convertConsts(consts) {
  return consts.map((value) => ({
    value: value,
    valueHl: (
      typeof(value)=='object' ?
      "<span class=\"proto-ref\">Proto #"+value['$func$']+"</span>":
      hljs.highlight('lua', value+'', true).value
    )
  }));
}

export function importData(jsonResponse) {
  var mappedData = {error: jsonResponse.error}
  var source = jsonResponse.source, sourceHl; // 1-base indexing
  var protos = jsonResponse.protos;
  if (protos && source) {
    // <FIXME> -- syntax highlighting
    var i, cont, sourceHl = [];
    for (i = 0; i < source.length; i++) {
      var res = hljs.highlight('lua', source[i], true, cont);
      sourceHl[i] = res.value;
      cont = res.top;
    }
    // </FIXME>
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
          source: source[i-1],
          sourceHl: sourceHl[i-1]
        });
      // process bytecodes
      proto.bc.forEach(function(bc, bcIdx) {
        bcIdx = bcIdx + 1 // 1-base indexing
        var id = 'BC'+protoIdx+':'+bcIdx;
        var atLineNo = bcMap[bcIdx-1];
        var lastLine = mappedLines[mappedLines.length - 1];
        var code = {
            id: id,
            index: bcIdx,
            code: bc,
            codeHl: hljs.highlight('lua', bc, true).value
        }
        if (lastLine && atLineNo && lastLine.index >= atLineNo) {
          lastLine.codes.push(code);
        } else {
          // middle lines without bytecodes
          while (atLineNo && i+1 < atLineNo) {
            mappedLines.push({
              index: i+1,
              source: source[i],
              sourceHl: sourceHl[i]
            })
            i = i+1
          }
          mappedLines.push({
            index: atLineNo,
            source: source[atLineNo - 1],
            sourceHl: sourceHl[atLineNo - 1],
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
          source: source[i],
          sourceHl: sourceHl[i]
        });
      var mappedProto = {
        id: 'P'+protoIdx,
        index: protoIdx,
        info: proto.info,
        consts: convertConsts(proto.consts),
        gcConsts: convertConsts(proto.gcconsts),
        lines: mappedLines
      }
      return mappedProto;
    })
  }
  return mappedData;
}
