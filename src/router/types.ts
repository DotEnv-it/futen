type Segment<T extends string> = T extends `${string}:${infer Param}` ? Param : T extends '*' ? '$' : never;
export type ParamsKey<Path extends string> = Path extends `${infer Part}/${infer Rest}` ? Segment<Part> | ParamsKey<Rest> : Segment<Path>;
export type Params<Path extends string, Value = string> = {
    [K in ParamsKey<Path>]: Value;
};
