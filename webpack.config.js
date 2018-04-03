module.exports = {
    entry: "./app/entry.jsx",
    output: {
        path: __dirname + '/app/public',
        filename: "bundle.js"
    },
    module: {
        loaders: [
            { test: /\.css$/, loader: "style!css" },
            { test: /\.jsx?/, loader: "babel-loader", exclude: /node_modules/, query: {presets:['es2015','react']} }
        ]
    },
    resolveLoader: {
        modules: [
            __dirname + "/node_modules"
        ]
    },
};
