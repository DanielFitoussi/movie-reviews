import express from 'express';
import swaggerUi from 'swagger-ui-express';
import routes from './routes';
import { openapiSpec } from './docs/openapi';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(express.json());
// API documentation: serve sends Swagger UI's files, setup builds the page from our spec.
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));
app.use(routes);
// Must be registered after the routes, so it catches their errors.
app.use(errorHandler);

export default app;
