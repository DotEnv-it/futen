import { describe, test, expect } from "bun:test";
import Futen, { middleware, route, routesFrom } from "../dist/index.mjs";

describe("MIDDLEWARE", () => {
  test("runs middleware on server scope", async () => {
    @route("/")
    class Index {
      get(request: Request) {
        return Response.json({ hello: "world" }, { headers: request.headers });
      }
    }

    const server = new Futen(
      { Index },
      {
        middleware: {
          "*/": (request) => {
            request.headers.set("x-middleware", "true");
            return request;
          },
        },
        port: 0,
      }
    );

    const response = await server.instance.fetch(
      new Request(`http://localhost:${server.instance.port}/`)
    );
    expect(await response.json()).toEqual({ hello: "world" });
    expect(response.headers.get("x-middleware")).toBe("true");

    server.instance.stop();
  });

  test("runs middleware on route scope", async () => {
    @middleware((request) => {
      request.headers.set("x-middleware", "true");
      return request;
    })
    @route("/")
    class Index {
      get(request: Request) {
        expect(request.headers.get("x-middleware")).toBe("true");
        return Response.json({ hello: "world" }, { headers: request.headers });
      }
    }

    const server = new Futen({ Index }, { port: 0 });

    const response = await server.instance.fetch(
      new Request(`http://localhost:${server.instance.port}/`)
    );
    expect(await response.json()).toEqual({ hello: "world" });
    expect(response.headers.get("x-middleware")).toBe("true");

    server.instance.stop();
  });

  test("runs multiple middlewares on route scope", async () => {
    @middleware((request) => {
      request.headers.set("x-middleware", "true");
      return request;
    })
    @middleware((request) => {
      request.headers.set("x-middleware2", "true");
      request.headers.set("x-middleware", "false");
      return request;
    })
    @route("/")
    class Index {
      get(request: Request) {
        return Response.json({ hello: "world" }, { headers: request.headers });
      }
    }

    const server = new Futen({ Index }, { port: 0 });

    const body = await server.instance.fetch(
      new Request(`http://localhost:${server.instance.port}/`)
    );
    expect(await body.json()).toEqual({ hello: "world" });
    expect(body.headers.get("x-middleware")).toBe("false");
    expect(body.headers.get("x-middleware2")).toBe("true");

    server.instance.stop();
  });

  test("runs middleware on dynamic route scope", async () => {
    @middleware((request, params) => {
      request.headers.set("x-middleware", "true");
      request.headers.set("x-id", params.id);
      return request;
    })
    @route("/:id")
    class Index {
      get(request: Request) {
        expect(request.headers.get("x-middleware")).toBe("true");
        return Response.json({ hello: "world" }, { headers: request.headers });
      }
    }

    const server = new Futen({ Index }, { port: 0 });

    const response = await server.instance.fetch(
      new Request(`http://localhost:${server.instance.port}/123`)
    );
    expect(await response.json()).toEqual({ hello: "world" });
    expect(response.headers.get("x-middleware")).toBe("true");
    expect(response.headers.get("x-id")).toBe("123");

    server.instance.stop();
  });

  test("runs middleware on dynamic route on server scope", async () => {
    @route("/:id/test")
    class Index {
      get(request: Request) {
        return Response.json({ hello: "world" }, { headers: request.headers });
      }
    }

    const server = new Futen(
      { Index },
      {
        middleware: {
          "/*/test": (request, params) => {
            request.headers.set("x-middleware", "true");
            request.headers.set("x-id", params.id);
            return request;
          },
        },
        port: 0,
      }
    );

    const response = await server.instance.fetch(
      new Request(`http://localhost:${server.instance.port}/123/test`)
    );
    expect(await response.json()).toEqual({ hello: "world" });
    expect(response.headers.get("x-middleware")).toBe("true");
    expect(response.headers.get("x-id")).toBe("123");

    server.instance.stop();
  });

  test("runs middleware with response return", async () => {
    @middleware(() => {
      return new Response("Hello Middleware");
    })
    @route("/")
    class Index {
      get(request: Request) {
        return Response.json({ hello: "world" }, { headers: request.headers });
      }
    }

    const server = new Futen({ Index }, { port: 0 });

    const response = await server.instance.fetch(
      new Request(`http://localhost:${server.instance.port}/`)
    );
    expect(await response.text()).toBe("Hello Middleware");

    server.instance.stop();
  });

  test("runs middleware with multiple response return", async () => {
    @middleware(() => {
      return new Response("Hello Middleware");
    })
    @middleware((response) => {
      expect(response instanceof Response).toBe(true);
      return new Response("Hello Middleware 2");
    })
    @route("/")
    class Index {
      get(request: Request) {
        return Response.json({ hello: "world" }, { headers: request.headers });
      }
    }

    const server = new Futen({ Index }, { port: 0 });

    const response = await server.instance.fetch(
      new Request(`http://localhost:${server.instance.port}/`)
    );
    expect(await response.text()).toBe("Hello Middleware 2");

    server.instance.stop();
  });

  test("runs middleware with multiple response return on server scope", async () => {
    @route("/")
    class Index {
      get(request: Request) {
        return Response.json({ hello: "world" }, { headers: request.headers });
      }
    }

    const server = new Futen(
      { Index },
      {
        middleware: {
          "*/": [
            () => new Response("Hello Middleware"),
            () => new Response("Hello Middleware 2"),
          ],
        },
        port: 0,
      }
    );

    const response = await server.instance.fetch(
      new Request(`http://localhost:${server.instance.port}/`)
    );
    expect(await response.text()).toBe("Hello Middleware 2");

    server.instance.stop();
  });

  test("runs middleware with multiple response return on dynamic route", async () => {
    @middleware((_req, params) => {
      expect(params.id).toBe("123");
      return new Response("Hello Middleware");
    })
    @middleware((response) => {
      expect(response instanceof Response).toBe(true);
      return new Response("Hello Middleware 2");
    })
    @route("/:id")
    class Index {
      get(request: Request) {
        return Response.json({ hello: "world" }, { headers: request.headers });
      }
    }

    const server = new Futen({ Index }, { port: 0 });

    const response = await server.instance.fetch(
      new Request(`http://localhost:${server.instance.port}/123`)
    );
    expect(await response.text()).toBe("Hello Middleware 2");

    server.instance.stop();
  });

  test("runs middleware with multiple response return on dynamic route on server and route scope", async () => {
    @middleware((response, params) => {
      expect(params.id).toBe("123");
      expect(response instanceof Response).toBe(true);
      return new Response("Hello Middleware 2");
    })
    @route("/:id/test")
    class Index {
      get(request: Request) {
        return Response.json({ hello: "world" }, { headers: request.headers });
      }
    }

    const server = new Futen(
      { Index },
      {
        middleware: {
          "/*/test": [
            (_req, params) => {
              expect(params.id).toBe("123");
              return new Response("Hello Middleware");
            },
          ],
        },
        port: 0,
      }
    );

    const response = await server.instance.fetch(
      new Request(`http://localhost:${server.instance.port}/123/test`)
    );
    expect(await response.text()).toBe("Hello Middleware 2");

    server.instance.stop();
  });

  test("runs middleware from file route", async () => {
    const server = new Futen(routesFrom("../examples"), { port: 0 });
    const response = await server.instance.fetch(
      new Request(`http://localhost:${server.instance.port}/fileRoute`)
    );
    expect(await response.json()).toEqual({ hello: "world" });
    expect(response.headers.get("x-middleware")).toBe("true");

    server.instance.stop();
  });

  test("runs middleware mapped to different routes", async () => {
    @route("/:id")
    class Index {
      get(request: Request) {
        return Response.json({ hello: "world" }, { headers: request.headers });
      }
    }

    @route("/test")
    class Test {
      get(request: Request) {
        return Response.json({ hello: "world" }, { headers: request.headers });
      }
    }

    const server = new Futen(
      { Index, Test },
      {
        middleware: {
          "/test": (request) => {
            request.headers.set("x-middleware", "true");
            return request;
          },
          "/123": (request) => {
            request.headers.set("x-middleware", "123");
            return request;
          },
        },
        port: 0,
      }
    );

    const response = await server.instance.fetch(
      new Request(`http://localhost:${server.instance.port}/123`)
    );
    expect(await response.json()).toEqual({ hello: "world" });
    expect(response.headers.get("x-middleware")).toBe("123");

    const response2 = await server.instance.fetch(
      new Request(`http://localhost:${server.instance.port}/test`)
    );
    expect(await response2.json()).toEqual({ hello: "world" });
    expect(response2.headers.get("x-middleware")).toBe("true");

    server.instance.stop();
  });
});
