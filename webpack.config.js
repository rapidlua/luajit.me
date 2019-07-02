const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractCssChunks = require('extract-css-chunks-webpack-plugin');
const CssChunksHtmlPlugin = require('css-chunks-html-webpack-plugin');
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');

const GRAPHVIZ_WASM_SRC = 'client/graphviz/graphviz.wasm';
const GRAPHVIZ_WASM_DEST =
    'graphviz.'
    +crypto.createHash('sha256').update(fs.readFileSync(GRAPHVIZ_WASM_SRC)).digest('hex').substr(0,20)
    +'.wasm';

module.exports = {
    entry: __dirname + "/client/entry.jsx",
    mode: process.env.NODE_ENV || "production",
    output: {
        publicPath: '/static/',
        path: __dirname + '/server/public/static',
        chunkFilename: '[name].[contenthash].js',
        filename: '[name].[contenthash].js'
    },
    module: {
        rules: [
            {
                test: /\.jsx?/,
                loader: "babel-loader",
                exclude: /node_modules/,
                query: { presets: ['env', 'react'] }
            },
            { test: /\.css$/, use: [ { loader: ExtractCssChunks.loader }, "css-loader" ] },
            {
                test: /\.worker\.js/,
                loader: "worker-loader",
                options: { name: '[name].[contenthash].js' }
            },
            {
                test: /graphviz.js/,
                loader: "string-replace-loader",
                options: { search: "graphviz.wasm", replace: path.basename(GRAPHVIZ_WASM_DEST) }
            }
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
        // contenthash presumably depends on the module id, hence stable
        // module ids are paramount
        new webpack.HashedModuleIdsPlugin({
            hashFunction: 'sha256',
            hashDigest: 'hex',
            hashDigestLength: 4
        }),
        new ExtractCssChunks({
            chunkFilename: '[name].[contenthash].css',
            filename: '[name].[contenthash].css'
        }),
        new CopyWebpackPlugin([
            {from: GRAPHVIZ_WASM_SRC, to: GRAPHVIZ_WASM_DEST}
        ]),
        new OptimizeCssAssetsPlugin({
            cssProcessor: require('cssnano'),
            cssProcessorPluginOptions: {
                preset: ['default', { discardComments: { removeAll: true } }]
            }
        }),
        new HtmlWebpackPlugin({
            template: 'client/index.html',
            filename: '../index.html',
            minify: {
                collapseWhitespace: true,
                removeComments: true
            }
        }),
        new CssChunksHtmlPlugin({ inject: false })
    ]
};
