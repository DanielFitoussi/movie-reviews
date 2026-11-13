import SwaggerParser from '@apidevtools/swagger-parser';
import { OpenAPIV3 } from 'openapi-types';
import app from '../../src/app';
import { openapiSpec } from '../../src/docs/openapi';

// These tests keep the hand-written spec in sync with the real Express routes.

interface RegisteredRoute {
  key: string; // e.g. "patch /movies/{id}"
  handlerNames: string[]; // e.g. ["authenticate", "requireAdmin", "updateMovie"]
}

// Express path "/movies/:id" -> OpenAPI path "/movies/{id}".
const toOpenApiPath = (path: string) => path.replace(/:(\w+)/g, '{$1}');

// Express 5 keeps its routes in app.router.stack. A layer is either a route
// (it has .route) or a mounted router (its .handle has its own .stack).
// This is Express internals, not a public API: if an upgrade changes it,
// the "finds the routes" test below fails instead of quietly passing.
const collectRoutes = (stack: any[]): RegisteredRoute[] =>
  stack.flatMap((layer): RegisteredRoute[] => {
    if (layer.route) {
      const path = toOpenApiPath(layer.route.path);
      const handlerNames = layer.route.stack.map((handler: any) => handler.name);
      return Object.keys(layer.route.methods).map((method) => ({
        key: `${method} ${path}`,
        handlerNames,
      }));
    }
    if (layer.handle?.stack) {
      // We only read route paths, not mount paths, so every router must be mounted at "/".
      // A router mounted at e.g. "/api" would make the paths below wrong, so stop here.
      if (!layer.slash) {
        throw new Error('A router is mounted on a path; collectRoutes must be updated');
      }
      return collectRoutes(layer.handle.stack);
    }
    return []; // plain middleware (express.json, Swagger UI, errorHandler)
  });

const registeredRoutes = collectRoutes((app as any).router.stack);

const METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

// Every operation in the spec, keyed like the registered routes.
const documentedOperations = new Map<string, OpenAPIV3.OperationObject>();
for (const [path, pathItem] of Object.entries(openapiSpec.paths)) {
  for (const method of METHODS) {
    const operation = pathItem?.[method];
    if (operation) {
      documentedOperations.set(`${method} ${path}`, operation);
    }
  }
}

describe('OpenAPI spec', () => {
  it('is a valid OpenAPI document', async () => {
    // validate() changes the object it gets (it resolves $refs), so give it a copy.
    await expect(SwaggerParser.validate(structuredClone(openapiSpec))).resolves.toBeDefined();
  });

  it('finds the routes registered in Express', () => {
    // Guards the walk above: if Express internals change, this fails loudly.
    expect(registeredRoutes.map((route) => route.key)).toContain('get /health');
  });

  it('documents every registered route, and nothing else', () => {
    const registered = registeredRoutes.map((route) => route.key).sort();
    const documented = [...documentedOperations.keys()].sort();

    expect(documented).toEqual(registered);
  });

  it.each(registeredRoutes.map((route) => [route.key, route]))(
    '%s has a lock in the docs exactly when it uses authenticate',
    (key, route) => {
      const operation = documentedOperations.get(key);
      const usesAuthenticate = route.handlerNames.includes('authenticate');

      if (usesAuthenticate) {
        expect(operation?.security).toEqual([{ bearerAuth: [] }]);
      } else {
        expect(operation?.security).toBeUndefined();
      }
    },
  );
});
