import {
  getDevSourcemap,
  getRuntimeAwareEntry,
  getSourcemapFilePath,
  useStylePlugin,
} from '@example/bundler-shared/bundler.mjs';
import { plugin as stylePlugin } from '@fluentic/style/plugin/webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default (_, argv) => {
  const dev = argv.mode === 'development';
  const stylePluginEnabled = useStylePlugin();

  return {
    devtool: dev ? 'cheap-module-source-map' : 'source-map',
    entry: path.join(rootDir, getRuntimeAwareEntry('src/main.tsx', 'src/main.runtime.tsx')),
    output: {
      clean: true,
      path: path.join(rootDir, 'dist'),
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.jsx', '.js'],
    },
    module: {
      rules: [
        {
          test: /\.[jt]sx?$/,
          exclude: (modulePath) =>
            /[\\/]node_modules[\\/]/.test(modulePath) &&
            !/[\\/]@example[\\/]bundler-shared[\\/]/.test(modulePath),
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', { targets: 'defaults' }],
                ['@babel/preset-react', { runtime: 'automatic', importSource: '@fluentic/style' }],
                ['@babel/preset-typescript', { isTSX: true, allExtensions: true }],
              ],
            },
          },
        },
        {
          test: /\.css$/i,
          use: [dev ? 'style-loader' : MiniCssExtractPlugin.loader, 'css-loader'],
        },
      ],
    },
    plugins: [
      stylePluginEnabled && stylePlugin({
        devSourcemap: dev ? getDevSourcemap() : 'sourceUrl',
        getSourcemapFilePath,
      }),
      new HtmlWebpackPlugin({
        template: path.join(rootDir, 'index.html'),
      }),
      !dev && new MiniCssExtractPlugin(),
    ].filter(Boolean),
    devServer: {
      host: '127.0.0.1',
      port: 4174,
    },
  };
};
