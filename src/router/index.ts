/*
 * Based on @medley/router
 * @link https://www.npmjs.com/package/@medley/router
 * @link https://github.com/medleyjs/router
 * @license MIT
 */
interface Node<T> {
    pathPart: string;
    store: T | null;
    staticChildren: Map<number, Node<T>> | null;
    parametricChild: {
        paramName: string,
        store: T | null,
        staticChild: Node<T> | null
    } | null;
    wildcardStore: T | null;
}

type ParametricNode<T> = NonNullable<Node<T>['parametricChild']>;

export default class Router<T> {
    private readonly root: Node<T>;

    public constructor() {
        this.root = createNode('/');
    }

    public register(path: string): T {
        if (typeof path !== 'string')
            throw new TypeError('Route path must be a string');

        if (path === '' || path[0] !== '/')
            throw new Error(`Invalid route: ${path}\nRoute path must begin with a "/"`);

        const endsWithWildcard = path.endsWith('*');

        if (endsWithWildcard)
            path = path.slice(0, -1); // Slice off trailing '*'

        const staticParts = path.split(/:.+?(?=\/|$)/);
        const paramParts = path.match(/:.+?(?=\/|$)/g) ?? [];

        if (staticParts[staticParts.length - 1] === '')
            staticParts.pop();

        let node = this.root;
        let paramPartsIndex = 0;

        for (let i = 0; i < staticParts.length; ++i) {
            let pathPart = staticParts[i];

            if (i > 0) {
                // Set parametric properties on the node
                const paramName = paramParts[paramPartsIndex++].slice(1);

                if (node.parametricChild === null)
                    node.parametricChild = createParametricNode(paramName);
                else if (node.parametricChild.paramName !== paramName)
                    throw new Error(`Cannot create route "${path}" with parameter "${paramName}" because a route already exists with a different parameter name ("${node.parametricChild.paramName}") in the same location`);

                const { parametricChild } = node;

                if (parametricChild.staticChild === null) {
                    node = parametricChild.staticChild = createNode(pathPart);
                    continue;
                }

                node = parametricChild.staticChild;
            }

            for (let j = 0; ;) {
                if (j === pathPart.length) {
                    if (j < node.pathPart.length) {
                        // Move the current node down
                        const childNode = cloneNode(node, node.pathPart.slice(j));
                        Object.assign(node, createNode(pathPart, [childNode]));
                    }
                    break;
                }

                if (j === node.pathPart.length) {
                    if (node.staticChildren === null)
                        node.staticChildren = new Map();
                    else {
                        const staticChild = node.staticChildren.get(pathPart.charCodeAt(j));
                        if (staticChild !== undefined) {
                            node = staticChild;
                            pathPart = pathPart.slice(j);
                            j = 0;
                            continue;
                        }
                    }

                    // Create new node
                    const childNode = createNode<T>(pathPart.slice(j));
                    node.staticChildren.set(pathPart.charCodeAt(j), childNode);
                    node = childNode;

                    break;
                }

                if (pathPart[j] !== node.pathPart[j]) {
                    // Split the node
                    const existingChild = cloneNode(node, node.pathPart.slice(j));
                    const newChild = createNode<T>(pathPart.slice(j));

                    Object.assign(
                        node,
                        createNode(node.pathPart.slice(0, j), [existingChild, newChild])
                    );

                    node = newChild;

                    break;
                }

                ++j;
            }
        }

        if (paramPartsIndex < paramParts.length) {
            // The final part is a parameter
            const param = paramParts[paramPartsIndex];
            const paramName = param.slice(1);

            if (node.parametricChild === null)
                node.parametricChild = createParametricNode<T>(paramName);
            else if (node.parametricChild.paramName !== paramName)
                throw new Error(`Cannot create route "${path}" with parameter "${paramName}" because a route already exists with a different parameter name ("${node.parametricChild.paramName}") in the same location`);
            return node.parametricChild.store as T;
        }
        if (endsWithWildcard)
            return node.wildcardStore as T;
        return node.store as T;
    }

    public find(url: string): { store: T, params: Record<string, string> } | null {
        if (url === '' || url[0] !== '/')
            return null;

        const queryIndex = url.indexOf('?');
        const urlLength = queryIndex >= 0 ? queryIndex : url.length;

        return matchRoute<T>(url, urlLength, this.root, 0);
    }
}

function createNode<T>(pathPart: string, staticChildren?: Node<T>[]): Node<T> {
    return {
        pathPart,
        store: null,
        staticChildren:
            staticChildren === undefined
                ? null
                : new Map(staticChildren.map((child) => [child.pathPart.charCodeAt(0), child])),
        parametricChild: null,
        wildcardStore: null
    };
}

function cloneNode<T>(node: Node<T>, newPathPart: string): Node<T> {
    return {
        pathPart: newPathPart,
        store: node.store,
        staticChildren: node.staticChildren,
        parametricChild: node.parametricChild,
        wildcardStore: node.wildcardStore
    };
}

function createParametricNode<T>(paramName: string): ParametricNode<T> {
    return {
        paramName,
        store: null,
        staticChild: null
    };
}

function matchRoute<T>(
    url: string,
    urlLength: number,
    node: Node<T>,
    startIndex: number
): { store: T, params: Record<string, string> } | null {
    const { pathPart } = node;
    const pathPartLen = pathPart.length;
    const pathPartEndIndex = startIndex + pathPartLen;

    // Only check the pathPart if its length is > 1 since the parent has
    // already checked that the url matches the first character
    if (pathPartLen > 1) {
        if (pathPartEndIndex > urlLength)
            return null;

        if (pathPartLen < 15) {
            // Using a loop is faster for short strings
            for (let i = 1, j = startIndex + 1; i < pathPartLen; ++i, ++j) {
                if (pathPart[i] !== url[j])
                    return null;
            }
        } else if (url.slice(startIndex, pathPartEndIndex) !== pathPart)
            return null;
    }

    startIndex = pathPartEndIndex;

    if (startIndex === urlLength) {
        // Reached the end of the URL
        if (node.store !== null) {
            return {
                store: node.store,
                params: {}
            };
        }

        if (node.wildcardStore !== null) {
            return {
                store: node.wildcardStore,
                params: { $: '' }
            };
        }

        return null;
    }

    if (node.staticChildren !== null) {
        const staticChild = node.staticChildren.get(url.charCodeAt(startIndex));

        if (staticChild !== undefined) {
            const route = matchRoute(url, urlLength, staticChild, startIndex);

            if (route !== null)
                return route;
        }
    }

    if (node.parametricChild !== null) {
        const parametricNode = node.parametricChild;
        const slashIndex = url.indexOf('/', startIndex);

        if (slashIndex !== startIndex) {
            // Params cannot be empty
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
                const route = matchRoute(
                    url,
                    urlLength,
                    parametricNode.staticChild,
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

    if (node.wildcardStore !== null) {
        return {
            store: node.wildcardStore,
            params: {
                $: url.slice(startIndex, urlLength)
            }
        };
    }

    return null;
}
