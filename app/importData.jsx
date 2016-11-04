function convertConsts(consts) {
  return consts.map((value) => {
    value += "";
    var match = value.match(/^P(\d+)$/);
    return {
    value: value,
    valueHi: (
      match ?
      "<span class=\"proto-ref\">Proto #"+match[1]+"</span>":
      hljs.highlight('lua', value, true).value
    )};
  });
}

function convertPrototype(proto, protoIndex, src) {
  var lines = src && src[0];
  var linesHi = src && src[1];
  var resultLines = [];
  var atLineno = Math.max(0, proto.info.linedefined - 1);

  function putLines(lastLineToPut) {
    // there's no line #0 though it is sometimes referenced
    lastLineToPut = Math.max(lastLineToPut, 1);
    if (!lines) {
      var line = {bytecode: []};
      atLineno = 10000000; // make sure we put bogus line exactly once
      resultLines[0] = line;
      return line;
    }
    for (var i = atLineno + 1; i <= lastLineToPut; i++) {
      resultLines.push({
        key: i,
        id: "L"+protoIndex+":"+i,
        lineno: i,
        code: lines[i],
        codeHi: linesHi[i],
        bytecode: []
      });
    }
    atLineno = Math.max(atLineno, lastLineToPut);
    return resultLines[resultLines.length - 1];
  }

  var bcMap = proto.bcmap;
  var resultMap = [];
  proto.bc.forEach(function(bc, index) {
    var line = putLines(bcMap[index]);
    line.bytecode.push({
        id: 'BC'+protoIndex+':'+index,
        index: index,
        code: bc,
        codeHi: hljs.highlight('lua', bc, true).value
    });
    resultMap[index] = line.lineno;
  });

  putLines(proto.info.lastlinedefined); // in case of trailing lines w/o bytecode

  return {
    id: 'P'+protoIndex,
    index: protoIndex,
    info: proto.info,
    consts: convertConsts(proto.consts),
    gcConsts: convertConsts(proto.gcconsts),
    lines: resultLines,
    bytecodeMap: resultMap
  };
}

function convertIr(ir) {
  if (!ir)
    return [];
  return ir.replace(/\s+$/,"").split("\n").map((ir) => ({
    code: ir.replace(/^\d+\s/,"")
  }));
}

function convertAsm(asm) {
  if (!asm)
    return [];
  return asm.replace(/\s+$/, "").split("\n").map(function (asm) {
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

function getSourceLines(sourceFiles, sourceId, cache) {
  var result = cache && cache[sourceId];
  if (result)
    return result;
  var source = sourceFiles[sourceId];
  if (!source)
    return;
  var lines = ("\n"+source).split("\n"); // line numbers start with 1
  var linesHi = [];
  var hiContinuation;
  for (var i = 0; i < lines.length; i++) {
    var hiResult = hljs.highlight('lua', lines[i], true, hiContinuation);
    linesHi[i] = hiResult.value;
    hiContinuation = hiResult.top;
  }
  result = [lines, linesHi];
  if (cache)
    cache[sourceId] = result;
  return result;
}

export function importData(jsonResponse) {
  var mappedData = {error: jsonResponse.error}
  var sourceFiles = jsonResponse.sourcefiles;
  var prototypes = jsonResponse.prototypes;
  var traces = jsonResponse.traces;
  if (Array.isArray(prototypes) && typeof(sourceFiles) == "object") {
    var cache = {};
    mappedData.prototypes = prototypes.map((proto, i) => (
      convertPrototype(
        proto, i,
        typeof(proto.info) == "object" &&
        getSourceLines(sourceFiles, proto.info.source, cache)
      )
    ));
  } else {
    mappedData.prototypes = [];
  }
  if (Array.isArray(traces)) {
    var trIndex = {};
    mappedData.traces = traces.map(
      (tr, idx) => convertTrace(tr, idx, trIndex)
    );
  } else {
    mappedData.traces = [];
  }
  console.log(mappedData);
  return mappedData;
}
