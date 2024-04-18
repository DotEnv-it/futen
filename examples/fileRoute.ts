import { middleware } from '../dist/index.mjs';

@middleware((request) => {
    request.headers.set('x-middleware', 'true');
    return request;
})
export default class FileRoute {
    public get(request: Request): Response {
        return Response.json(
            { hello: 'world' },
            { headers: request.headers }
        );
    }
}
