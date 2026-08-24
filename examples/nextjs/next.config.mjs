import stylePlugin from '@fluentic/style/plugin/nextjs';
import { getSourcemapFilePath } from '../bundlers/shared/bundler.mjs';
import { cx } from './lib/classNameStyle.mjs';

/** @type {import('next').NextConfig} */
let nextConfig = {
  output: process.env.MODE === 'ssg' ? 'export' : undefined,
  trailingSlash: process.env.MODE === 'ssg',
};

nextConfig = stylePlugin(nextConfig, {
  getSourcemapFilePath,
  importSources: [{
    source: './classNameStyle.mjs',
    name: 'cx',
    styleFn: cx,
  }],
  // layer: false,
});

export default nextConfig;
