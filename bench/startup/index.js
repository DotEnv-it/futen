import { exec } from './lib.js';

exec('Byte', [
    'import { Byte, send } from "@bit-js/byte"',
    'performance.mark("Build start")',
    'const { fetch } = new Byte()'
], (route) => `\t.get('${route.path}', () => send.body(${route.value}))`);

exec('Hono', [
    'import { Hono } from "hono"',
    'import { LinearRouter as Router } from "hono/router/linear-router"',
    'performance.mark("Build start")',
    'const { fetch } = new Hono({ router: new Router() })'
], (route) => `\t.get('${route.path}', (ctx) => ctx.body(${route.value}))`);

exec('Elysia', [
    'import { Elysia } from "elysia"',
    'performance.mark("Build start")',
    'const { fetch } = new Elysia()'
], (route) => `\t.get('${route.path}', () => ${route.value})`);

exec('Futen', [
    'import Futen from "./index.js"',
    'performance.mark("Build start")',
    'const { fetch } = new Futen()'
], (route) => `\t.get('${route.path}', () => ${route.value})`);