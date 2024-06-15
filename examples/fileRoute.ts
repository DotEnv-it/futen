import { middleware } from '../dist/index.mjs';
import type { FutenHTTPRoute } from '../dist/index.mjs';

@middleware((request) => {
    request.headers.set('x-middleware', 'true');
    return request;
})
// The route here is the path of the file relative to where it's being called from
// index.ts -> `Futen(routesFrom(routes))`
// routes/
//     fileRoute.ts -> contains the `FileRoute` class
//
export default class FileRoute implements FutenHTTPRoute<'/fileRoute'> {
    public get(
        request: Request
    ): Response {
        console.log(request.headers.get('x-middleware'));
        return Response.json(
            { hello: 'world' },
            { headers: request.headers }
        );
    }
}
