import memoizeOne from "memoize-one";

export function getSelection(state) {
  return state.selection === undefined ? selectFirstTraceOrProto(state.response)
  : state.selection;
}

const selectFirstTraceOrProto = memoizeOne((response) => {
  const objects = response.objects;
  let pindex = -1;
  for (let i = 0; objects && objects[i]; ++i) {
    switch (objects[i].type) {
    case "trace":
    case "trace.abort":
      return i;
    case "proto":
      if (pindex === -1) pindex = i;
    }
  }
  return pindex;
});

function makeTraceSignature(trace) {
  return trace.parent === undefined
  ? "root!" + (trace.trace[0] || []).join(":")
  : "side!" + trace.parent + ":" + trace.parentexit;
}

function transformObjects(response) {
  const similar = {};
  const objects = [];
  let pcounter = 0;
  let tcounter = 0;
  response.objects && response.objects.forEach((object, index) => {
    switch (object.type) {
    default:
      break;
    case "file":
      object = Object.assign({}, object);
      if (!object.text) object.text = response.input.text;
      break;
    case "proto":
      object = Object.create(object);
      object.type = "proto";
      object.id = index;
      object.name = pcounter++;
      {
        // "fix" bcmap and build inverse mapping (linemap)
        let lineDefined = object.info.linedefined;
        if (!lineDefined) {
          lineDefined = 1;
          object.info = Object.assign(
            {}, object.info, { linedefined: lineDefined }
          );
        }
        const nlines = object.info.lastlinedefined - lineDefined + 1;
        let currentLine = 0;
        const lineMap = object.linemap = [];
        object.bcmap = object.bcmap.map((lineno, index) => {
          currentLine = Math.max(lineno - lineDefined, currentLine);
          while (lineMap.length <= currentLine)
            lineMap.push(index);
          return currentLine;
        });
        while (lineMap.length <= nlines)
          lineMap.push(object.bcmap.length);
        // segments
        const holeMap = new Array(nlines).fill(false);
        for (let gck of object.gcktable) {
          if (gck.type === "proto") {
            const childInfo = response.objects[gck.value].info;
            holeMap.fill(
              true,
              childInfo.linedefined + 1 - lineDefined,
              childInfo.lastlinedefined - lineDefined);
          }
        }
        for (let i = 0; i < nlines; ++i) {
          if (lineMap[i] !== lineMap[i + 1]) holeMap[i] = false;
        }
        for (let i = 0; i < nlines; ++i) {
          if (!holeMap[i - 1] && !holeMap[i + 1]) holeMap[i] = false;
        }
        const segments = object.segments = [];
        let first = 0;
        for (let i = 1; i < nlines; ++i) {
          if (holeMap[i] !== holeMap[first]) {
            segments.push([ first, i ]);
            first = i;
          }
        }
        segments.push([ first, nlines ]);
      }
      break;
    case "trace":
    case "trace.abort":
      const tdesc = Object.create(object);
      tdesc.type = object.type;
      tdesc.id = index;
      tdesc.name = tcounter++;
      // -> interpreter typically lacks a trace
      if (!object.trace || object.trace.length == 0) {
        const alike = similar[makeTraceSignature(object)];
        if (alike)
          tdesc.trace = alike.trace.slice(0, 1);
      } else if (object.type === "trace.abort")
        similar[makeTraceSignature(object)] = object;
      object = tdesc;
      break;
    case "jit.flush":
      similar = {};
      break;
    }
    objects[index] = object;
  });
  return objects;
}

function coalesceAborts(objects) {
  const similar = {};
  const coalesced = [];
  objects.forEach((object, index) => {
    coalesced[index] = object;
    if (object.type !== "trace.abort") {
      if (object.type === "jit.flush") similar = {};
      return;
    }
    const signature = makeTraceSignature(object);
    const alikeList = similar[signature];
    if (!alikeList) {
      similar[signature] = [ object ];
      return;
    }
    const alikeIndex = alikeList.findIndex((a) => {
      const atrace = a.trace;
      return object.reason === a.reason
        && object.trace.length === atrace.length
        && object.trace.every((el, i) =>
          el[0] == atrace[i][0] && el[1] == atrace[i][1]
        );
    });
    if (alikeIndex == -1) {
      alikeList.push(object);
      return;
    }
    let alike = alikeList[alikeIndex];
    if (alike.k === undefined) {
       // Original descriptor must stay intact; make a clone
       const clone = coalesced[alike.id] = alikeList[alikeIndex] =
         Object.create(Object.getPrototypeOf(alike));
       Object.assign(clone, alike);
       clone.k = 2;
       alike = clone;
    } else ++alike.k;
    coalesced[index] = alike;
  });
  return coalesced;
}

export function getObjects(state) {
  return state.response._objects ||
    (state.response._objects = coalesceAborts(transformObjects(state.response)));
}

export function getSelectedObject(state) {
  return getObjects(state)[getSelection(state)];
}
