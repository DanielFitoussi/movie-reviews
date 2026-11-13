import { OpenAPIV3 } from 'openapi-types';
import { components, errorResponse } from './components';

// The OpenAPI document served by Swagger UI at /api-docs.
// tests/unit/openapi.test.ts checks it against the real Express routes,
// so adding a route without documenting it here makes the tests fail.

const ref = (name: string) => ({ $ref: `#/components/responses/${name}` });

const jsonBody = (schemaName: string): OpenAPIV3.RequestBodyObject => ({
  required: true,
  content: { 'application/json': { schema: { $ref: `#/components/schemas/${schemaName}` } } },
});

const jsonResponse = (
  description: string,
  schema: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject,
): OpenAPIV3.ResponseObject => ({
  description,
  content: { 'application/json': { schema } },
});

const schemaRef = (name: string) => ({ $ref: `#/components/schemas/${name}` });

const idParam = (description: string): OpenAPIV3.ParameterObject => ({
  name: 'id',
  in: 'path',
  required: true,
  description,
  schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$', example: '6af702193e5431112168e05d' },
});

// Endpoints with this need a JWT: Swagger UI shows a lock and sends the token from Authorize.
const requiresLogin = [{ bearerAuth: [] }];

const invalidJson = { error: 'Invalid JSON body' };
const invalidMovieId = { error: 'Invalid movie id' };
const invalidReviewId = { error: 'Invalid review id' };

const movieQueryParam = (
  name: string,
  description: string,
  schema: OpenAPIV3.SchemaObject,
): OpenAPIV3.ParameterObject => ({ name, in: 'query', required: false, description, schema });

export const openapiSpec: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: {
    title: 'Movie Reviews API',
    version: '1.0.0',
    description:
      'Movies, reviews and ratings. To call a locked endpoint: log in with POST /auth/login, ' +
      'copy the token, click Authorize and paste it.',
  },
  tags: [
    { name: 'Health' },
    { name: 'Auth', description: 'Registration and login' },
    { name: 'Movies', description: 'Everyone can view and search. Only admins can write.' },
    { name: 'Reviews', description: 'Everyone can view. Logged-in users can write.' },
  ],
  components,
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Check that the server is up',
        responses: {
          200: {
            description: 'The server is running.',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { status: { type: 'string' } } },
                example: { status: 'ok' },
              },
            },
          },
          500: ref('InternalError'),
        },
      },
    },

    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        description:
          'The role is always "user", even if the request sends another one. ' +
          'Admins are never created through the API.',
        requestBody: jsonBody('Credentials'),
        responses: {
          201: jsonResponse('The user was created.', schemaRef('User')),
          400: errorResponse('Invalid data.', {
            missingFields: { error: 'username and password are required' },
            shortPassword: {
              error: 'Validation failed',
              details: { password: 'password must be at least 8 characters' },
            },
            invalidJson,
          }),
          409: errorResponse('The username is already taken (case-insensitive).', {
            duplicate: { error: 'Username is already taken' },
          }),
          500: ref('InternalError'),
        },
      },
    },

    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in and get a JWT',
        requestBody: jsonBody('Credentials'),
        responses: {
          200: jsonResponse('Logged in.', schemaRef('LoginResponse')),
          400: errorResponse('Missing fields or invalid JSON.', {
            missingFields: { error: 'username and password are required' },
            invalidJson,
          }),
          401: errorResponse(
            'Wrong username or password (the same message for both, on purpose).',
            { wrongCredentials: { error: 'Invalid username or password' } },
          ),
          500: ref('InternalError'),
        },
      },
    },

    '/movies': {
      get: {
        tags: ['Movies'],
        summary: 'List and search movies',
        description: 'Public. Sorted by title. Filters can be combined; each one may appear once.',
        parameters: [
          movieQueryParam('title', 'Partial match, case-insensitive ("incep" finds "Inception").', {
            type: 'string',
          }),
          movieQueryParam(
            'genre',
            'Whole value, case-insensitive ("sci-fi" finds "Sci-Fi", "sci" doesn\'t).',
            { type: 'string' },
          ),
          movieQueryParam('year', 'Exact release year.', { type: 'integer', example: 2010 }),
          movieQueryParam('director', 'Whole value, case-insensitive.', { type: 'string' }),
        ],
        responses: {
          200: jsonResponse('The matching movies (may be empty).', {
            type: 'array',
            items: schemaRef('Movie'),
          }),
          400: errorResponse('Invalid query parameter.', {
            yearNotInteger: { error: 'Query parameter "year" must be an integer' },
            repeatedParameter: { error: 'Query parameter "genre" must be a single value' },
          }),
          500: ref('InternalError'),
        },
      },
      post: {
        tags: ['Movies'],
        summary: 'Create a movie (admin only)',
        description:
          'reviewsCount, averageRating and createdBy are set by the server; ' +
          'if the body includes them, they are ignored.',
        security: requiresLogin,
        requestBody: jsonBody('MovieInput'),
        responses: {
          201: jsonResponse('The movie was created.', schemaRef('Movie')),
          400: errorResponse('Invalid data.', {
            validation: {
              error: 'Validation failed',
              details: {
                title: 'Path `title` is required.',
                releaseYear: 'Path `releaseYear` (1800) is less than minimum allowed value (1888).',
                genres: 'genres must contain at least one item',
              },
            },
            invalidJson,
          }),
          401: ref('Unauthorized'),
          403: ref('AdminOnly'),
          500: ref('InternalError'),
        },
      },
    },

    '/movies/{id}': {
      parameters: [idParam('The movie id.')],
      get: {
        tags: ['Movies'],
        summary: 'Get a movie',
        description: 'Public. Includes reviewsCount and averageRating.',
        responses: {
          200: jsonResponse('The movie.', schemaRef('Movie')),
          400: errorResponse('The id is not a valid id.', { invalidId: invalidMovieId }),
          404: ref('MovieNotFound'),
          500: ref('InternalError'),
        },
      },
      patch: {
        tags: ['Movies'],
        summary: 'Update a movie (admin only)',
        description: 'Partial update: only the fields that are sent change.',
        security: requiresLogin,
        requestBody: jsonBody('MoviePatch'),
        responses: {
          200: jsonResponse('The updated movie.', schemaRef('Movie')),
          400: errorResponse('Invalid id or data.', {
            invalidId: invalidMovieId,
            validation: {
              error: 'Validation failed',
              details: { genres: 'genres must contain at least one item' },
            },
            invalidJson,
          }),
          401: ref('Unauthorized'),
          403: ref('AdminOnly'),
          404: ref('MovieNotFound'),
          500: ref('InternalError'),
        },
      },
      delete: {
        tags: ['Movies'],
        summary: 'Delete a movie and all its reviews (admin only)',
        security: requiresLogin,
        responses: {
          204: { description: 'Deleted. No body.' },
          400: errorResponse('The id is not a valid id.', { invalidId: invalidMovieId }),
          401: ref('Unauthorized'),
          403: ref('AdminOnly'),
          404: ref('MovieNotFound'),
          500: ref('InternalError'),
        },
      },
    },

    '/movies/{id}/reviews': {
      parameters: [idParam('The movie id.')],
      get: {
        tags: ['Reviews'],
        summary: "List a movie's reviews",
        description: 'Public. Newest first, with each author\'s username.',
        responses: {
          200: jsonResponse('The reviews (may be empty).', {
            type: 'array',
            items: schemaRef('ReviewWithAuthor'),
          }),
          400: errorResponse('The id is not a valid id.', { invalidId: invalidMovieId }),
          404: ref('MovieNotFound'),
          500: ref('InternalError'),
        },
      },
      post: {
        tags: ['Reviews'],
        summary: 'Review a movie (logged-in users)',
        description: 'One review per user per movie. Updates the movie\'s rating stats.',
        security: requiresLogin,
        requestBody: jsonBody('ReviewInput'),
        responses: {
          201: jsonResponse('The review was created.', schemaRef('Review')),
          400: errorResponse('Invalid id or data.', {
            invalidId: invalidMovieId,
            validation: {
              error: 'Validation failed',
              details: {
                text: 'Path `text` is required.',
                rating: 'Path `rating` (11) is more than maximum allowed value (10).',
              },
            },
            invalidJson,
          }),
          401: ref('Unauthorized'),
          404: ref('MovieNotFound'),
          409: errorResponse('This user already reviewed this movie.', {
            duplicate: { error: 'You already reviewed this movie' },
          }),
          500: ref('InternalError'),
        },
      },
    },

    '/reviews/{id}': {
      parameters: [idParam('The review id.')],
      patch: {
        tags: ['Reviews'],
        summary: 'Update a review (author only)',
        description: 'Only the author can edit, not even an admin. Only rating and text change.',
        security: requiresLogin,
        requestBody: jsonBody('ReviewPatch'),
        responses: {
          200: jsonResponse('The updated review.', schemaRef('Review')),
          400: errorResponse('Invalid id or data.', {
            invalidId: invalidReviewId,
            validation: {
              error: 'Validation failed',
              details: { rating: 'Path `rating` (11) is more than maximum allowed value (10).' },
            },
            invalidJson,
          }),
          401: ref('Unauthorized'),
          403: errorResponse('Not the author of this review.', {
            notAuthor: { error: 'Only the author can edit this review' },
          }),
          404: ref('ReviewNotFound'),
          500: ref('InternalError'),
        },
      },
      delete: {
        tags: ['Reviews'],
        summary: 'Delete a review (author or admin)',
        security: requiresLogin,
        responses: {
          204: { description: 'Deleted. No body.' },
          400: errorResponse('The id is not a valid id.', { invalidId: invalidReviewId }),
          401: ref('Unauthorized'),
          403: errorResponse('Neither the author nor an admin.', {
            notAllowed: { error: 'Only the author or an admin can delete this review' },
          }),
          404: ref('ReviewNotFound'),
          500: ref('InternalError'),
        },
      },
    },
  },
};
