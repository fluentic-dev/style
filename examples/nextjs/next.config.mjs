import stylePlugin from '@fluentic/style/plugin/nextjs';
import { getSourcemapFilePath } from '../bundlers/shared/bundler.mjs';

/** @type {import('next').NextConfig} */
let nextConfig = {
  output: process.env.MODE === 'ssg' ? 'export' : undefined,
  trailingSlash: process.env.MODE === 'ssg',
};

nextConfig = stylePlugin(nextConfig, {
  getSourcemapFilePath,
  layer: false,
});

export default nextConfig;
