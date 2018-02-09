'use strict';
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const FaviconsWebpackPlugin = require('favicons-webpack-plugin');

module.exports = {
    entry: './src/ui.js',
    output: {
        path: path.join(__dirname, 'dist'),
        filename: 'bundle.js'
    },
    plugins: [
        // Copy our app's index.html to the build folder.
        new CopyWebpackPlugin([{ from: './src/index.html', to: 'index.html' }]),
        new FaviconsWebpackPlugin('./src/assets/augmint_logo_512.png')
    ]
};
