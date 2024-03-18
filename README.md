<h1 align="center"> ☁️ Futen 風天 (Heavenly Wind) </h1>
<h2 align="center"> A (very) lightweight web framework, using decorators, simplifying syntax </h2>

### **Get started with:**

```sh
bun init

bun i futen
```

```ts
import Futen, { route } from "futen";

@route("/")
class Index {
  public get() {
    return new Response("Hello, World!");
  }
}

const server = new Futen({
  Index
})

console.log(`Server is running at http://localhost:${server.instance.port}`);
```

---

## Know how

`route` defines an HTTP/REST route class which reserves the following methods as "keywords":
- `get`
- `head`
- `post`
- `put`
- `delete`
- `connect`
- `options`
- `trace`
- `patch`

`ws`, similarly to the `route` decorator, reserves WebSocket event "keywords", which are documented in the [Bun websocket docs](https://bun.sh/docs/api/websockets#reference), directly referencing the following methods:
- `message`
- `open`
- `close`
- `drain`
- `ping`
- `pong`

To see how they could be used check out the [examples](./examples/)

---

## Contributors
<a href = "https://github.com/dotenv-it/futen/contributors">
  <img src = "https://contributors-img.web.app/image?repo=dotenv-it/futen"/>
</a>

## **🤝 Become a contributor!**

- Read the [contributing guidelines](CONTRIBUTING.md)
- Fork it!
- Do stuff...
- Submit a pull request!
