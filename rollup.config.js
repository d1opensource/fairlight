import resolve from '@rollup/plugin-node-resolve'
import {terser as minify} from 'rollup-plugin-terser'

const external = [
  'typesafe-actions',
  'eventemitter3',
  'hoist-non-react-statics',
  'react' // peer dependency
]

module.exports = [
  {
    input: './dist/index.js',
    output: [
      {
        dir: './dist',
        format: 'esm',
        sourcemap: true
      },
      {
        file: './dist/index.cjs.js',
        format: 'cjs',
        sourcemap: true,
        exports: 'named'
      }
    ],
    external,
    plugins: [resolve()]
  },
  {
    input: './dist/index.js',
    output: {
      file: './dist/index.cjs.min.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
      plugins: [
        minify({
          mangle: {
            toplevel: true
          },
          compress: {
            toplevel: true
          }
        })
      ]
    },
    external,
    plugins: [resolve()]
  }
]
