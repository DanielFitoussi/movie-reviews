import { OpenAPIV3 } from 'openapi-types';

// Reusable parts of the spec. Paths point to them with $ref, so each one
// is written once and a change here updates every endpoint that uses it.

const objectId = (example: string): OpenAPIV3.SchemaObject => ({
  type: 'string',
  pattern: '^[0-9a-fA-F]{24}$',
  example,
});

const timestamps: Record<string, OpenAPIV3.SchemaObject> = {
  createdAt: { type: 'string', format: 'date-time', example: '2026-11-13T12:27:05.724Z' },
  updatedAt: { type: 'string', format: 'date-time', example: '2026-11-13T12:27:05.724Z' },
  __v: { type: 'integer', description: 'Mongoose version key', example: 0 },
};

// The editable movie fields. Shared by MovieInput (all required) and MoviePatch (all optional).
const movieFields: Record<string, OpenAPIV3.SchemaObject> = {
  title: { type: 'string', minLength: 1, example: 'Inception' },
  releaseYear: {
    type: 'integer',
    minimum: 1888,
    description: 'From 1888 (the first film) to the current year + 5.',
    example: 2010,
  },
  genres: {
    type: 'array',
    minItems: 1,
    items: { type: 'string' },
    example: ['Sci-Fi', 'Thriller'],
  },
  director: { type: 'string', minLength: 1, example: 'Christopher Nolan' },
  actors: {
    type: 'array',
    minItems: 1,
    items: { type: 'string' },
    example: ['Leonardo DiCaprio', 'Elliot Page'],
  },
  description: {
    type: 'string',
    minLength: 1,
    example: 'A thief who steals secrets through dreams.',
  },
};

const reviewFields: Record<string, OpenAPIV3.SchemaObject> = {
  rating: { type: 'integer', minimum: 1, maximum: 10, example: 9 },
  text: { type: 'string', minLength: 1, example: 'Mind-bending and beautifully shot.' },
};

const schemas: Record<string, OpenAPIV3.SchemaObject> = {
  Error: {
    type: 'object',
    required: ['error'],
    properties: {
      error: { type: 'string', example: 'Movie not found' },
      details: {
        type: 'object',
        description: 'Only on validation errors: one message per invalid field.',
        additionalProperties: { type: 'string' },
      },
    },
  },

  Credentials: {
    type: 'object',
    required: ['username', 'password'],
    properties: {
      username: {
        type: 'string',
        description: 'Unique and case-insensitive (stored in lowercase).',
        example: 'dana',
      },
      password: { type: 'string', minLength: 8, format: 'password', example: 'secret123' },
    },
  },
  User: {
    type: 'object',
    properties: {
      id: objectId('6af701f8e9394eed58a194da'),
      username: { type: 'string', example: 'dana' },
      role: { type: 'string', enum: ['user', 'admin'], example: 'user' },
    },
  },
  LoginResponse: {
    type: 'object',
    properties: {
      token: {
        type: 'string',
        description: 'JWT with the user id and role. Valid for 1 day.',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2YWY3MDFmOGU5Mzk0ZWVkNThhMTk0ZGEiLCJyb2xlIjoidXNlciJ9.signature',
      },
    },
  },

  MovieInput: {
    type: 'object',
    required: Object.keys(movieFields),
    properties: movieFields,
  },
  MoviePatch: {
    type: 'object',
    description: 'Only the fields that are sent change. Each one is still validated.',
    properties: movieFields,
    example: { description: 'A thief enters dreams to plant an idea.' },
  },
  Movie: {
    type: 'object',
    properties: {
      _id: objectId('6af702193e5431112168e05d'),
      ...movieFields,
      reviewsCount: { type: 'integer', readOnly: true, example: 1 },
      averageRating: {
        type: 'number',
        readOnly: true,
        description: 'Rounded to one decimal place. 0 when there are no reviews.',
        example: 9,
      },
      createdBy: { ...objectId('6af702193e5431112168e05b'), description: 'The admin who created it.' },
      ...timestamps,
    },
  },

  ReviewInput: {
    type: 'object',
    required: ['rating', 'text'],
    properties: reviewFields,
  },
  ReviewPatch: {
    type: 'object',
    description: 'Only rating and text can be changed. Only the fields that are sent change.',
    properties: reviewFields,
    example: { rating: 8 },
  },
  Review: {
    type: 'object',
    properties: {
      _id: objectId('6af702193e5431112168e060'),
      movieId: objectId('6af702193e5431112168e05d'),
      userId: objectId('6af702193e5431112168e05e'),
      ...reviewFields,
      ...timestamps,
    },
  },
  ReviewWithAuthor: {
    type: 'object',
    description: 'A review as listed: userId is replaced with the author\'s id and username.',
    properties: {
      _id: objectId('6af702193e5431112168e060'),
      movieId: objectId('6af702193e5431112168e05d'),
      userId: {
        type: 'object',
        properties: {
          _id: objectId('6af702193e5431112168e05e'),
          username: { type: 'string', example: 'dana' },
        },
      },
      ...reviewFields,
      ...timestamps,
    },
  },
};

// Builds an error response with one or more named examples
// (Swagger UI shows a dropdown when there are several).
export const errorResponse = (
  description: string,
  examples: Record<string, { error: string; details?: Record<string, string> }>,
): OpenAPIV3.ResponseObject => ({
  description,
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/Error' },
      examples: Object.fromEntries(
        Object.entries(examples).map(([name, value]) => [name, { value }]),
      ),
    },
  },
});

const responses: Record<string, OpenAPIV3.ResponseObject> = {
  Unauthorized: errorResponse('Not logged in: the token is missing, invalid or expired.', {
    missingToken: { error: 'Missing or invalid Authorization header' },
    invalidToken: { error: 'Invalid or expired token' },
  }),
  AdminOnly: errorResponse('Logged in, but not an admin.', {
    notAdmin: { error: 'Admins only' },
  }),
  MovieNotFound: errorResponse('No movie with this id.', {
    notFound: { error: 'Movie not found' },
  }),
  ReviewNotFound: errorResponse('No review with this id.', {
    notFound: { error: 'Review not found' },
  }),
  InternalError: errorResponse('Unexpected server error.', {
    internal: { error: 'Internal server error' },
  }),
};

export const components: OpenAPIV3.ComponentsObject = {
  schemas,
  responses,
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Get a token from POST /auth/login and paste it here (without "Bearer").',
    },
  },
};
