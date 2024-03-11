import { $ } from 'bun';

const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_';
const charactersLength = characters.length;
export const routesCount = 100;

// Make everything as random as possible
function makePart(): string {
    const result = [];
    const length = 2 + Math.round(Math.random() * 16);
    // @ts-expect-error - dummy
    for (let cnt = 0; cnt < length; ++cnt) result.push(characters[Math.floor(Math.random() * charactersLength)]);

    return result.join('');
}

export function makePath(idx: number): string {
    const parts = new Array(routesCount);
    for (let i = 0; i < routesCount; ++i) parts[i] = makePart();

    // Put URL params randomly to force the paths to be registered on the radix tree
    parts[idx] = `:${parts[idx]}`;
    return `/${parts.join('/')}`;
}

export const routes = new Array(routesCount);
for (let i = 0; i < routesCount; ++i) routes[i] = { path: makePart(), value: `"${Math.random()}"` };

export async function exec(name: string, content: string[], chain: { (route: any): string, (route: any): string, (route: any): string, (route: any): string, (arg0: any): any }, type: string | undefined): Promise<void> {
    for (let i = 0; i < routesCount; ++i) content.push(chain(routes[i]));
    if (type === 'futen') {
        content.push('performance.mark("Build start")');
        content.push('const server = new Futen(Routes)');
    }

    content.push('fetch(new Request("http://localhost:3000"))');
    content.push('performance.mark("Build end")');
    content.push('console.log(fetch.toString())');
    content.push(`console.log(performance.measure("${name}: Build ${routesCount} routes", "Build start", "Build end"))`);

    const path = `./dist/${name}.${type === 'futen' ? 'ts' : 'js'}`;

    await Bun.write(path, content.join('\n'));
    await $`bun run ${path}`;
}
