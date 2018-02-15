'use strict';
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: './src/ui.js',
    output: {
        path: path.join(__dirname, 'dist'),
        filename: 'bundle.js'
    },
    plugins: [
        // Copy our app's index.html and assets to the build folder.
        new CopyWebpackPlugin([
            { from: 'src/index.html', to: '' },
            { from: 'public', to: '' }
        ])
    ]
};
