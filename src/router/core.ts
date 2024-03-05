import { HTTPRoute } from './rest'
import { WSRoute } from './websocket'

/**
 * Generic helper function to override methods in a class
 */
function overrideMethods<T>(
  target: T,
  methods: Record<string, Function>,
  override: Record<string, Function> = {}
) {
  for (const method in methods) {
    if (override[method]) {
      Object.defineProperty(target, method, {
        value: override[method],
        writable: true,
        enumerable: true,
        configurable: true
      })
      continue
    }
    Object.defineProperty(target, method, {
      value: methods[method],
      writable: true,
      enumerable: true,
      configurable: true
    })
  }
  return target
}

/**
 * Generic route is used to instantiate both HTTP and WebSocket routes
 * ---
 * It will take the target class and add the methods from it which override the default methods
 */
export class Route {
  constructor(
    public target: Function,
    public path: string,
    public typeOfRoute: 'http' | 'ws'
  ) {
    switch (typeOfRoute) {
      case 'http':
        overrideMethods(this, HTTPRoute, target.prototype)
        return this
      case 'ws':
        overrideMethods(this, WSRoute, target.prototype)
        return this
    }
  }
}
