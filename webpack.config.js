const path = require('path')
const CopyPlugin = require('copy-webpack-plugin')
const HtmlPlugin = require('html-webpack-plugin')
// const ExtractTextPlugin = require('extract-text-webpack-plugin')

// require("@babel/core/register");
// require("@babel/polyfill");

const PAGES_PATH = './src/pages'

function generateHtmlPlugins(items) {
  return items.map( (name) => new HtmlPlugin(
    {
      title: `Membrane Chrome Extension`,
      filename: `./${name}.html`,
      chunks: [name],
    }
  ))
}

module.exports = {
  mode: 'production',
  entry: {
    background: [
      '@babel/polyfill',
      `${PAGES_PATH}/background`,
    ],
    popup: [
      '@babel/polyfill',
      `${PAGES_PATH}/popup`,
    ],
    options: [
      '@babel/polyfill',
      `${PAGES_PATH}/options`,
    ]
  },
  output: {
    path: path.resolve('dist/pages'),
    filename: '[name].js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: [ 'babel-loader' ]
      },
      {
        test: /\.jpe?g$|\.gif$|\.png$|\.ttf$|\.eot$|\.svg$/,
        use: 'file-loader?name=[name].[ext]?[hash]'
      },
      {
        test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        loader: 'url-loader?limit=10000&mimetype=application/fontwoff'
      },
    ]
  },
  plugins: [
    // new ExtractTextPlugin(
    //   {
    //     filename: '[name].[contenthash].css',
    //   }
    // ),
    new CopyPlugin(
      [
        {
          from: 'src',
          to: path.resolve('dist'),
          ignore: [ 'pages/**/*' ]
        }
      ]
    ),
    ...generateHtmlPlugins(
      [
        'background',
        'popup',
        'options',
      ]
    )
  ]
}
