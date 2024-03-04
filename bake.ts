// import { $ } from 'bun'
import { Options, build } from 'tsup'

const commonConfig = {
  entry: ['./src/**/*.ts'],
  sourcemap: false,
  clean: true,
  dts: true,
  minify: true,
  target: 'node21'
} satisfies Options

const builds = [
  build({
    name: 'compile esm',
    format: 'esm',
    outDir: './dist',
    ...commonConfig
  })
  // build({
  //   name: 'compile cjs',
  //   format: 'cjs',
  //   outDir: './dist/cjs',
  //   ...commonConfig
  // })
]

console.info('Building...')
await Promise.all(builds)

// Bun needs to be baked separetely to ensure tastiness :D
await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist/bun',
  minify: true,
  target: 'bun',
  sourcemap: 'external'
})

// console.info('Preparing the type files...')
// await $`cp dist/cjs/*.d.ts dist/`
// await $`cp dist/cjs/router/*.d.ts dist/router/`
console.info('Done!')

process.exit()
