<h1 align="center"> ☁️ Futen 風天 (Heavenly Wind) </h1>
<h2 align="center"> A (very) lightweight web framework, using decorators, simplifying syntax </h2>

### **Get Started with:**

```sh
bun init

bun i futen
```

```ts
import { HTTPServer, route } from "futen";

@route("/")
class Index {
  get() {
    return new Response("Hello, World!");
  }
}

const server = new HTTPServer({
  Index
})

console.log(`Server is running at http://localhost:${server.instance.port}`);
```

### Build

```sh
bun bake
```

---

## **🤝 Contributing**

- Fork it!
- Read the [contributing guidelines](CONTRIBUTING.md)
- Submit a pull request

## Contributors
<a href = "https://github.com/dotenv-it/futen/contributors">
  <img src = "https://contributors-img.web.app/image?repo=dotenv-it/futen"/>
</a>

---

License [MIT](LICENSE).
