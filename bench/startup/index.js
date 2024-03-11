import { exec } from './lib'

exec('Byte', [
  'import { Byte, send } from "@bit-js/byte"',
  'performance.mark("Build start")',
  'const { fetch } = new Byte()'
], (route) => `\t.get('${route.path}', () => send.body(${route.value}))`)

exec('Hono', [
  'import { Hono } from "hono"',
  'import { LinearRouter as Router } from "hono/router/linear-router"',
  'performance.mark("Build start")',
  'const { fetch } = new Hono({ router: new Router() })'
], (route) => `\t.get('${route.path}', (ctx) => ctx.body(${route.value}))`)

exec('Elysia', [
  'import { Elysia } from "elysia"',
  'performance.mark("Build start")',
  'const { fetch } = new Elysia()'
], (route) => `\t.get('${route.path}', () => ${route.value})`)

function futenRoute(route) {
  return `@route("/${route.path}")
class Route${route.path.replace(/\//g, '_').replace(/:/g, '')} {
  get() {
    return new Response(${route.value});
  }
}
Routes["${route.path}"] = Route${route.path.replace(/\//g, '_').replace(/:/g, '')}
`
}

exec('Futen', [
  'import Futen, { route } from "./index.mjs"',
  // 'performance.mark("Build start")',
  'const Routes = {}'
], (route) => futenRoute(route), 'futen')
