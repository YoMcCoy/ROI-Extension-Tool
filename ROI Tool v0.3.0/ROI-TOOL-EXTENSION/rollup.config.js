import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'src/content.js',
  output: {
    file: 'dist/content.js',
    format: 'iife',
    name: 'ContentScript'
  },
  plugins: [resolve()]
};
