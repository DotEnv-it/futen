type Segment<T extends string> = T extends `${string}:${infer Param}` ? Param : T extends '*' ? '$' : never;
export type ParamsKey<Path extends string> = Path extends `${infer Part}/${infer Rest}` ? Segment<Part> | ParamsKey<Rest> : Segment<Path>;
export type Params<Path extends string, Value = string> = {
    [K in ParamsKey<Path>]: Value;
};

/// Tests
const path = '/user/:id/:name';
const versionedPath = '/v:version/user/:id/:name';
const wildcardPath = '/user/*';

const params = { id: '123', name: 'John' } satisfies Params<typeof path>;
const versionedParams = { version: '1', id: '123', name: 'John' } satisfies Params<typeof versionedPath>;
const wildcardParams = { $: '123/John' } satisfies Params<typeof wildcardPath>;

console.log(params.id);
console.log(versionedParams.version);
console.log(wildcardParams.$);

