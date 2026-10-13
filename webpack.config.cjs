const path = require('node:path');
const webpack = require('webpack');
module.exports = {
  mode: 'production', target: 'web',
  entry: path.resolve(__dirname, 'src/dashboard.js'),
  output: {filename:'dashboard.js',path:path.resolve(__dirname,'dist')},
  devtool: false,
  resolve: {
    fallback: {
      fs:false,net:false,crypto:require.resolve('telegram/crypto/crypto'), assert:false,stream:false,events:false,constants:false,
      path:require.resolve('path-browserify'), os:require.resolve('os-browserify/browser'),
      util:require.resolve('util/')
    }
  },
  plugins: [new webpack.ProvidePlugin({Buffer:['buffer','Buffer'],process:'process/browser'})],
  performance: { hints: false }
};
