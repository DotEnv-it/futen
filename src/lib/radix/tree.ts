class Node<T = any> {
    public pathPart: string;
    public store: T | null;
    public staticChildren: Map<number, Node> | null;
    public wildcardStore: T | null;
    public parametricChild: {
        paramName: string,
        store: T | null,
        staticChild: Node | null
    } | null;

    public constructor(pathPart: string, staticChildren?: Node[]) {
        this.pathPart = pathPart;
        this.store = null;
        this.staticChildren = staticChildren === undefined
            ? null
            : new Map(staticChildren.map((child) => [child.pathPart.charCodeAt(0), child]));
        this.wildcardStore = null;
        this.parametricChild = null;
    }

    public createParametricNode(paramName: string): void {
        this.parametricChild = {
            paramName,
            store: null,
            staticChild: null
        };
    }

    public cloneNode(newPathPart: string): this {
        return {
            ...this,
            pathPart: newPathPart
        };
    }

    public matchRoute(
        url: string,
        urlLength: number,
        startIndex: number
    ): { store: T, params: Record<string, string> } | null {
        const { pathPart } = this;
        const pathPartLen = pathPart.length;
        const pathPartEndIndex = startIndex + pathPartLen;

        if (pathPartLen > 1) {
            if (pathPartEndIndex > urlLength)
                return null;

            if (pathPartLen < 15) {
                for (let i = 1, j = startIndex + 1; i < pathPartLen; ++i, ++j) {
                    if (pathPart[i] !== url[j])
                        return null;
                }
            } else if (url.slice(startIndex, pathPartEndIndex) !== pathPart)
                return null;
        }

        startIndex = pathPartEndIndex;

        if (startIndex === urlLength) {
            if (this.store !== null) {
                return {
                    store: this.store,
                    params: {}
                };
            }

            if (this.wildcardStore !== null) {
                return {
                    store: this.wildcardStore,
                    params: { $: '' }
                };
            }

            return null;
        }

        if (this.staticChildren !== null) {
            const staticChild = this.staticChildren.get(url.charCodeAt(startIndex));

            if (staticChild !== undefined) {
                const route = this.matchRoute(url, urlLength, startIndex);

                if (route !== null)
                    return route;
            }
        }

        if (this.parametricChild !== null) {
            const parametricNode = this.parametricChild;
            const slashIndex = url.indexOf('/', startIndex);

            if (slashIndex !== startIndex) {
                if (slashIndex === -1 || slashIndex >= urlLength) {
                    if (parametricNode.store !== null) {
                        const params: Record<string, string> = {}; // This is much faster than using a computed property
                        params[parametricNode.paramName] = url.slice(startIndex, urlLength);
                        return {
                            store: parametricNode.store,
                            params
                        };
                    }
                } else if (parametricNode.staticChild !== null) {
                    const route = this.matchRoute(
                        url,
                        urlLength,
                        slashIndex
                    );

                    if (route !== null) {
                        route.params[parametricNode.paramName] = url.slice(
                            startIndex,
                            slashIndex
                        );
                        return route;
                    }
                }
            }
        }

        if (this.wildcardStore !== null) {
            return {
                store: this.wildcardStore,
                params: {
                    $: url.slice(startIndex, urlLength)
                }
            };
        }

        return null;
    }
}

export default class Router {
    private readonly root: Node;

    public constructor() {
        this.root = new Node('/');
    }

    public register<T>(path: string): T {
        if (typeof path !== 'string')
            throw new TypeError('Route path must be a string');

        if (path === '' || path[0] !== '/')
            throw new Error(`Invalid route: ${path}\nRoute path must begin with a "/"`);

        const endsWithWildcard = path.endsWith('*');

        if (endsWithWildcard)
            path = path.slice(0, -1);

        const staticParts = path.split(/:.+?(?=\/|$)/);
        const paramParts = path.match(/:.+?(?=\/|$)/g) ?? [];

        if (staticParts[staticParts.length - 1] === '')
            staticParts.pop();

        let node = this.root;
        let paramPartsIndex = 0;

        for (let i = 0; i < staticParts.length; ++i) {
            let pathPart = staticParts[i];
            if (i > 0) {
                const paramName = paramParts[paramPartsIndex++].slice(1);

                if (node.parametricChild === null)
                    node.createParametricNode(paramName);
                else if (node.parametricChild.paramName !== paramName)
                    throw new Error(`Cannot create route "${path}" with parameter "${paramName}" because a route already exists with a different parameter name ("${node.parametricChild.paramName}") in the same location`);
                if (node.parametricChild?.staticChild === null) {
                    node.parametricChild.staticChild = new Node(pathPart);
                    continue;
                }
            }

            for (let j = 0; ;) {
                if (j === pathPart.length) {
                    if (j < node.pathPart.length) {
                        const childNode = node.cloneNode(node.pathPart.slice(j));
                        Object.assign(node, new Node(pathPart, [childNode]));
                    }
                    break;
                }
                if (j === node.pathPart.length) {
                    if (node.staticChildren === null)
                        node.staticChildren = new Map();
                    else {
                        const staticChild = node.staticChildren.get(pathPart.charCodeAt(j));
                        if (staticChild !== undefined) {
                            pathPart = pathPart.slice(j);
                            j = 0;
                            continue;
                        }
                    }
                    const childNode = new Node(pathPart.slice(j));
                    node.staticChildren.set(pathPart.charCodeAt(j), childNode);
                    node = childNode;
                    break;
                }

                if (pathPart[j] !== node.pathPart[j]) {
                    const existingChild = node.cloneNode(node.pathPart.slice(j));
                    const newChild = new Node(pathPart.slice(j));

                    Object.assign(
                        node,
                        new Node(node.pathPart.slice(0, j), [existingChild, newChild])
                    );

                    node = newChild;
                    break;
                }

                ++j;
            }
        }

        if (paramPartsIndex < paramParts.length) {
            const param = paramParts[paramPartsIndex];
            const paramName = param.slice(1);

            if (node.parametricChild === null)
                node.createParametricNode(paramName);
            else if (node.parametricChild.paramName !== paramName)
                throw new Error(`Cannot create route "${path}" with parameter "${paramName}" because a route already exists with a different parameter name ("${node.parametricChild.paramName}") in the same location`);

            return node.parametricChild?.store;
        }

        if (endsWithWildcard)
            return node.wildcardStore;

        return node.store;
    }

    public find<T>(url: string): { store: T, params: Record<string, string> } | null {
        if (url === '' || url[0] !== '/')
            return null;

        const queryIndex = url.indexOf('?');
        const urlLength = queryIndex >= 0 ? queryIndex : url.length;

        return this.root.matchRoute(url, urlLength, 0);
    }
}
