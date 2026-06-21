import {
  getDevSourcemap,
  getRuntimeAwareEntry,
  getSourcemapFilePath,
  useStylePlugin,
} from '@example/bundler-shared/bundler.mjs';
import { plugin as stylePlugin } from '@fluentic/style/plugin/rspack';
import rspack from '@rspack/core';
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
          exclude: /[\\/]node_modules[\\/]/,
          use: {
            loader: 'builtin:swc-loader',
            options: {
              jsc: {
                parser: {
                  syntax: 'typescript',
                  tsx: true,
                },
                transform: {
                  react: {
                    runtime: 'automatic',
                    importSource: '@fluentic/style/plugin/jsx',
                  },
                },
              },
            },
          },
        },
        {
          test: /\.css$/i,
          type: 'css/auto',
        },
      ],
    },
    experiments: {
      css: true,
    },
    plugins: [
      stylePluginEnabled && stylePlugin({
        devSourcemap: dev ? getDevSourcemap() : 'sourceUrl',
        getSourcemapFilePath,
      }),
      new rspack.HtmlRspackPlugin({
        template: path.join(rootDir, 'index.html'),
      }),
    ].filter(Boolean),
    devServer: {
      host: '127.0.0.1',
      port: 4178,
    },
  };
};
