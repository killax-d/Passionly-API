const path = require('path');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
	entry: './server.js',
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: 'api.bundle.js'
	},
	plugins: [
		new webpack.IgnorePlugin(/^pg-native$/),
		new CopyPlugin({
	      patterns: [
	        {
	          from: 'cities.pbf',
	          to: '',
	        },
	        {
	          from: 'ssl/*',
	          to: '',
	        }
	      ],
	    }),
	],
	target: 'node'
};