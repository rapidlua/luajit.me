const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: __dirname + "/client/entry.jsx",
    mode: process.env.NODE_ENV || "production",
    output: {
        path: __dirname + '/server/public',
        filename: "bundle.js"
    },
    module: {
        rules: [
            { test: /\.css$/, loader: "style!css" },
            { test: /\.jsx?/, loader: "babel-loader", exclude: /node_modules/, query: {presets:['env','react']} }
        ]
    },
    externals: {
            react: 'React',
            'react-dom': 'ReactDOM'
    },
    resolveLoader: {
        modules: [
            __dirname + "/node_modules"
        ]
    },
    plugins: [
        new CopyWebpackPlugin(['client/styles.css']),
        new HtmlWebpackPlugin({
            template: 'client/index.html'
        })
    ]
};
