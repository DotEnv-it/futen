import { Options, build } from 'tsup';

const commonConfig = {
    entry: ['./src/**/*.ts'],
    sourcemap: false,
    clean: true,
    dts: true,
    minify: true,
    target: 'node21'
} satisfies Options;

const builds = [
    build({
        name: 'compile esm',
        format: 'esm',
        outDir: './dist',
        ...commonConfig
    })
];

console.info('Building...');
await Promise.all(builds);
console.info('Done!');

process.exit();
