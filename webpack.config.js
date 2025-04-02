const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const commonConfig = {
  entry: './lib/index.ts',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', { targets: "defaults" }],
                '@babel/preset-typescript'
              ]
            }
          },
          'ts-loader'
        ],
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js', '.scss']
  },
  output: {
    filename: 'smart-form.bundle.min.js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'window',
    library: 'Uoyroem'
  }
};

const productionConfig = {
  ...commonConfig,
  mode: 'production',
  devtool: 'source-map',
  module: {
    ...commonConfig.module,
    rules: [
      ...commonConfig.module.rules,
      {
        test: /\.scss$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          'sass-loader'
        ]
      }
    ]
  },
  plugins: [
    new CleanWebpackPlugin(),
    new MiniCssExtractPlugin({filename: "smart-form.min.css"})
  ],
  optimization: {
    minimize: true,
    splitChunks: {
      chunks: 'all'
    }
  }
};

// DEVELOPMENT конфигурация
const developmentConfig = {
  ...commonConfig,
  mode: 'development',
  devtool: 'eval-source-map',
  module: {
    ...commonConfig.module,
    rules: [
      ...commonConfig.module.rules,
      {
        test: /\.scss$/,
        use: [
          'style-loader',
          'css-loader',
          'sass-loader'
        ]
      }
    ]
  },
  plugins: [
    new CleanWebpackPlugin()
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    compress: true,
    port: 9000,
    hot: true,
    open: true
  }
};

module.exports = (env, argv) => {
  return argv.mode === 'production'
    ? productionConfig
    : developmentConfig;
};