import express from 'express';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(express.json());
app.use(routes);
// Must be registered after the routes, so it catches their errors.
app.use(errorHandler);

export default app;
