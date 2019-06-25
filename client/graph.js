export const renderJSON = (function(){
  const worker = require('worker-loader!./graphviz/graphviz.worker')();
  const queue = [];
  const stack = [];
  worker.onmessage = function(e) {
    if (stack.length===0) {
      let callback;
      while (callback = queue.pop()) stack.push(callback);
    }
    stack.pop()(
      e.data[0] && new Error(e.data[0]),
      e.data[1] && JSON.parse(e.data[1])
    );
  }
  return function(input, options, callback) {
    if (options===undefined) {
      options = {};
    } else if (callback === undefined && typeof options === 'function') {
      callback = options;
      options = {};
    }
    if (typeof callback !== 'function') callback();
    worker.postMessage([input, options]);
    queue.push(callback);
  }
})();

function htmlEscape(text) {
  return text.toString().replace(/[<>&"]/g, x=>{
    switch(x) {
    case '<': return '&lt;';
    case '>': return '&gt;';
    case '&': return '&amp;';
    case '"': return '&quot;';
    }
  });
}

export function getSVGAttrs(dotJSON, options) {
  const units = options && options.units || 'pt';
  const margin = options && options.margin !== undefined ? options.margin : 4;
  const [llx,lly,urx,ury] = dotJSON.bb.split(',');
  const width = urx - llx + 2*margin;
  const height = lly - ury + 2*margin;
  return {
    width: width + units,
    height: height + units,
    viewBox: [llx - margin, ury - margin, width, height].join(' ')
  }
}

export function createSVGRenderer(target) {
  const context = {};
  function appendFill(fill) {
    if (fill===undefined) fill = context.fill;
    if (fill) target.push(' fill="', htmlEscape(fill), '"');
  }
  function appendStroke(stroke) {
    if (stroke===undefined) stroke = context.stroke;
    if (stroke) target.push(' stroke="', htmlEscape(stroke), '"');
  }
  return function(cmd, overrideContext) {
    let fill, stroke;
    if (overrideContext) {
      fill = overrideContext.fill;
      stroke = overrideContext.stroke;
    }
    switch (cmd.op) {
    case 'c':
      context.stroke = cmd.color;
      break;
    case 'C':
      context.fill = cmd.color;
      break;
    case 'F':
      context.fontSize = cmd.size;
      context.fontFamily = cmd.face;
      break;
    case 'e':
      if (fill===undefined) fill = 'none'; // fallthrough
    case 'E':
      {
        const [x,y,w,h] = cmd.rect;
        target.push(
          '<ellipse cx="', x, '" cy="', y, '" rx="', w,
          '" ry="', h, '"'
        );
        appendFill(fill);
        appendStroke(stroke);
        target.push('/>');
      } break;
    case 'p':
      if (fill===undefined) fill = 'none'; // fallthrough
    case 'P':
      {
        target.push(
          '<polygon points="',
          cmd.points.map(([x,y])=>x+','+y).join(','),
          '"'
        );
        appendFill(fill);
        appendStroke(stroke);
        target.push('/>');
      } break;
    case 'b':
      if (fill===undefined) fill = 'none'; // fallthrough
    case 'B':
      {
        target.push(
          '<path d="M',
          cmd.points.map(([x,y],i)=>(i==1?'C':'')+x+','+y).join(','),
          '"'
        );
        appendFill(fill);
        appendStroke(stroke);
        target.push('/>');
      } break;
    case 'T':
      {
        let fontFamily, fontSize;
        if (overrideContext) {
          fontFamily = overrideContext.fontFamily;
          fontSize = overrideContext.fontSize;
        }
        if (stroke===undefined) stroke = 'none';
        if (fontFamily===undefined) fontFamily = context.fontFamily;
        if (fontSize===undefined) fontSize = context.fontSize;
        const {pt, align, width, text} = cmd;
        const [x, y] = pt;
        target.push(
          '<text x="', x, '" y="', y,
          '" text-anchor="', {l:'start',c:'middle',r:'end'}[align], '"'
        );
        appendFill(fill);
        appendStroke(stroke);
        if (fontFamily)
          target.push(' font-family="', htmlEscape(fontFamily), '"');
        if (fontSize)
          target.push(' font-size="', htmlEscape(fontSize), '"');
        target.push('>', htmlEscape(text), '</text>');
      } break;
    }
  }
}

export default {getSVGAttrs, createSVGRenderer, renderJSON};
