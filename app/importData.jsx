function convertConsts(consts) {
  return consts.map((value) => ({
    value: value,
    valueHi: (
      typeof(value)=='object' ?
      "<span class=\"proto-ref\">Proto #"+value['$func$']+"</span>":
      hljs.highlight('lua', value+'', true).value
    )
  }));
}

function convertPrototype(proto, protoIdx, source, sourceHl) {
  var firstLine = proto.info.linedefined;
  var lastLine = proto.info.lastlinedefined;
  var bcMap = proto.bcmap;
  var bcAltMap = [];
  var mappedLines = [];
  var i;
  // leading lines without bytecode
  for (i = Math.max(1, firstLine); i<bcMap[0]; i++)
    mappedLines.push({
      key: i,
      id: "L"+protoIdx+":"+i,
      lineno: i,
      code: source[i-1],
      codeHi: sourceHl[i-1]
    });
  // process bytecodes
  proto.bc.forEach(function(bc, bcIdx) {
    bcIdx = bcIdx + 1; // 1-base indexing
    var id = 'BR'+protoIdx+':'+bcIdx;
    var atLineNo = bcMap[bcIdx-1];
    var lastLine = mappedLines[mappedLines.length - 1];
    var code = {
        id: id,
        bcindex: bcIdx,
        code: bc,
        codeHi: hljs.highlight('lua', bc, true).value
    };
    if (lastLine && atLineNo && lastLine.lineno >= atLineNo) {
      lastLine.bytecode.push(code);
      bcAltMap[bcIdx - 1] = lastLine.lineno;
    } else {
      // middle lines without bytecodes
      while (atLineNo && i+1 < atLineNo) {
        mappedLines.push({
          key: i+1,
          id: "L"+protoIdx+":"+(i+1),
          lineno: i+1,
          code: source[i],
          codeHi: sourceHl[i]
        });
        i = i + 1;
      }
      mappedLines.push({
        key: atLineNo,
        lineno: atLineNo,
        id: "L"+protoIdx+":"+atLineNo,
        code: source[atLineNo - 1],
        codeHi: sourceHl[atLineNo - 1],
        bytecode: [code]
      });
      bcAltMap[bcIdx - 1] = atLineNo;
    }
    if (atLineNo > i)
      i = atLineNo;
  });
  // trailing lines without bytecode
  for (; i < lastLine; i++)
    mappedLines.push({
      key: i+1,
      lineno: i+1,
      code: source[i],
      codeHi: sourceHl[i]
    });
  return {
    id: 'P'+protoIdx,
    index: protoIdx,
    info: proto.info,
    consts: convertConsts(proto.consts),
    gcConsts: convertConsts(proto.gcconsts),
    lines: mappedLines,
    bytecodeMap: bcAltMap
  };
}

function convertIr(ir) {
  if (!Array.isArray(ir))
    return [];
  return ir.map((ir) => ({
    code: ir.replace(/^\d+\s/,"")
  }));
}

function convertAsm(asm) {
  if (!Array.isArray(asm))
    return [];
  return asm.map(function (asm) {
    asm = asm.replace(/^[0-9a-fA-F]+\s*/,"").replace(/->/,"; ->");
    return {
      code: asm,
      codeHi:hljs.highlight('x86asm', asm, true).value
    };
  });
}

function convertTrace(trace, traceIdx, trIndex) {
  var info = trace.info;
  var tr = trace.trace;
  var ir = trace.ir;
  var asm = trace.asm;
  var signature = [info.parent, info.parentexit].join();
  var similar = trIndex[signature];
  /* typically aborted traces are seen multiple times */
  if (info.error && similar && similar.trace.join() == tr.join() &&
      similar.info.error == info.error) {
    similar.info.observed = similar.info.observed + 1
    return
  }
  /* XXX */
  if (info.linktype == "interpreter" && tr.length == 0 && similar) {
    tr = [similar.trace[0]];
  }
  info.observed = 1;
  var res = {
    id: 'T'+traceIdx,
    index: traceIdx,
    info: info, trace: tr, ir: convertIr(ir), asm: convertAsm(asm)
  };
  trIndex[signature] = res;
  return res;
}

export function importData(jsonResponse) {
  var mappedData = {error: jsonResponse.error}
  var source = jsonResponse.source; // 1-base indexing
  var protos = jsonResponse.protos;
  var traces = jsonResponse.traces;
  if (Array.isArray(protos) && Array.isArray(source)) {
    // <FIXME> -- syntax highlighting
    var i, cont, sourceHl = [];
    for (i = 0; i < source.length; i++) {
      var res = hljs.highlight('lua', source[i], true, cont);
      sourceHl[i] = res.value;
      cont = res.top;
    }
    // </FIXME>
    mappedData.protos = protos.map((proto, protoIdx) => (
      convertPrototype(proto, protoIdx+1, source, sourceHl)
    ));
  } else {
    mappedData.protos = [];
  }
  if (Array.isArray(traces)) {
    var trIndex = {};
    mappedData.traces = traces.map(
      (tr, idx) => convertTrace(tr, idx+1, trIndex)
    );
  } else {
    mappedData.traces = [];
  }
  console.log(mappedData);
  return mappedData;
}
