var render = require('./graphviz.js').render;

onmessage = function(e) {
  render(e.data[0], e.data[1], function(error, result) {
    postMessage([error && error.message, result]);
  });
}
