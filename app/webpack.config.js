module.exports = {
    entry: "./entry.jsx",
    output: {
        path: __dirname + '/public',
        filename: "bundle.js"
    },
    module: {
        rules: [
            { test: /\.css$/, loader: "style!css" },
            { test: /\.jsx?/, loader: "babel-loader", exclude: /node_modules/, query: {presets:['env','react']} }
        ]
    },
    resolveLoader: {
        modules: [
            __dirname + "/node_modules"
        ]
    },
};
