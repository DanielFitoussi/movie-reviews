import request from 'supertest';
import app from '../../src/app';
import { Movie } from '../../src/models/movie.model';
import { getToken } from '../setup/auth';
import { useTestDatabase } from '../setup/db';

useTestDatabase();

// Every test starts with an empty database, so we create a fresh admin
// (directly in the DB) and log in before each test.
let admin: Awaited<ReturnType<typeof getToken>>;
beforeEach(async () => {
  admin = await getToken('admin');
});

const asAdmin = () => ({ Authorization: `Bearer ${admin.token}` });

const movieData = (overrides: Record<string, unknown> = {}) => ({
  title: 'Inception',
  releaseYear: 2010,
  genres: ['Sci-Fi', 'Thriller'],
  director: 'Christopher Nolan',
  actors: ['Leonardo DiCaprio'],
  description: 'A thief who steals secrets through dreams.',
  ...overrides,
});

// For Movie.create(), which bypasses the API and so needs createdBy itself.
const savedMovieData = (overrides: Record<string, unknown> = {}) =>
  movieData({ createdBy: admin.user.id, ...overrides });

const missingId = '64b7f0000000000000000000';

describe('Movies API', () => {
  describe('GET /movies', () => {
    beforeEach(async () => {
      await Movie.create([
        savedMovieData(),
        savedMovieData({ title: 'Interstellar', releaseYear: 2014, genres: ['Sci-Fi', 'Drama'] }),
        savedMovieData({
          title: 'Pulp Fiction',
          releaseYear: 1994,
          genres: ['Crime'],
          director: 'Quentin Tarantino',
        }),
      ]);
    });

    it('returns 200 and all movies', async () => {
      const res = await request(app).get('/movies');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(3);
    });

    it('searches by title', async () => {
      const res = await request(app).get('/movies').query({ title: 'pulp' });

      expect(res.status).toBe(200);
      expect(res.body.map((m: { title: string }) => m.title)).toEqual(['Pulp Fiction']);
    });

    it('filters by genre, year and director together', async () => {
      const res = await request(app)
        .get('/movies')
        .query({ genre: 'Sci-Fi', year: '2014', director: 'Christopher Nolan' });

      expect(res.status).toBe(200);
      expect(res.body.map((m: { title: string }) => m.title)).toEqual(['Interstellar']);
    });

    it('returns 400 when year is not a number', async () => {
      const res = await request(app).get('/movies').query({ year: 'abc' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when a filter is sent more than once', async () => {
      const res = await request(app).get('/movies?genre=Crime&genre=Drama');

      expect(res.status).toBe(400);
    });
  });

  describe('GET /movies/:id', () => {
    it('returns 200 and the movie', async () => {
      const movie = await Movie.create(savedMovieData());

      const res = await request(app).get(`/movies/${movie.id}`);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        _id: movie.id,
        title: 'Inception',
        reviewsCount: 0,
        averageRating: 0,
      });
    });

    it('returns 404 when the movie does not exist', async () => {
      const res = await request(app).get(`/movies/${missingId}`);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Movie not found' });
    });

    it('returns 400 for an invalid id', async () => {
      const res = await request(app).get('/movies/not-an-id');

      expect(res.status).toBe(400);
    });
  });

  describe('POST /movies', () => {
    it('returns 201 and the created movie', async () => {
      const res = await request(app).post('/movies').set(asAdmin()).send(movieData());

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ ...movieData(), reviewsCount: 0, averageRating: 0 });
      expect(res.body._id).toBeDefined();
      expect(await Movie.countDocuments()).toBe(1);
    });

    it('sets createdBy to the admin from the token, not from the body', async () => {
      const res = await request(app)
        .post('/movies')
        .set(asAdmin())
        .send(movieData({ createdBy: '64b7f0000000000000000002' }));

      expect(res.status).toBe(201);
      expect(res.body.createdBy).toBe(admin.user.id);
    });

    it('ignores reviewsCount and averageRating from the body', async () => {
      const res = await request(app)
        .post('/movies')
        .set(asAdmin())
        .send(movieData({ reviewsCount: 10, averageRating: 9 }));

      expect(res.status).toBe(201);
      expect(res.body.reviewsCount).toBe(0);
      expect(res.body.averageRating).toBe(0);
    });

    it('returns 400 with details when a field is missing', async () => {
      const { title, ...withoutTitle } = movieData();

      const res = await request(app).post('/movies').set(asAdmin()).send(withoutTitle);

      expect(res.status).toBe(400);
      expect(res.body.details).toHaveProperty('title');
      expect(await Movie.countDocuments()).toBe(0);
    });

    it('returns 400 when a field has the wrong type', async () => {
      const res = await request(app)
        .post('/movies')
        .set(asAdmin())
        .send(movieData({ releaseYear: 'soon' }));

      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid JSON', async () => {
      const res = await request(app)
        .post('/movies')
        .set(asAdmin())
        .set('Content-Type', 'application/json')
        .send('{ "title": ');

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /movies/:id', () => {
    it('returns 200 and updates only the sent fields', async () => {
      const movie = await Movie.create(savedMovieData());

      const res = await request(app)
        .patch(`/movies/${movie.id}`)
        .set(asAdmin())
        .send({ releaseYear: 2011 });

      expect(res.status).toBe(200);
      expect(res.body.releaseYear).toBe(2011);
      expect(res.body.title).toBe('Inception');
    });

    it('returns 400 when a sent field is invalid', async () => {
      const movie = await Movie.create(savedMovieData());

      const res = await request(app)
        .patch(`/movies/${movie.id}`)
        .set(asAdmin())
        .send({ actors: [] });

      expect(res.status).toBe(400);
      expect((await Movie.findById(movie.id))?.actors).toEqual(['Leonardo DiCaprio']);
    });

    it('returns 404 when the movie does not exist', async () => {
      const res = await request(app)
        .patch(`/movies/${missingId}`)
        .set(asAdmin())
        .send({ title: 'X' });

      expect(res.status).toBe(404);
    });

    it('returns 400 for an invalid id', async () => {
      const res = await request(app)
        .patch('/movies/not-an-id')
        .set(asAdmin())
        .send({ title: 'X' });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /movies/:id', () => {
    it('returns 204 and deletes the movie', async () => {
      const movie = await Movie.create(savedMovieData());

      const res = await request(app).delete(`/movies/${movie.id}`).set(asAdmin());

      expect(res.status).toBe(204);
      expect(res.body).toEqual({});
      expect(await Movie.countDocuments()).toBe(0);
    });

    it('returns 404 when the movie does not exist', async () => {
      const res = await request(app).delete(`/movies/${missingId}`).set(asAdmin());

      expect(res.status).toBe(404);
    });

    it('returns 400 for an invalid id', async () => {
      const res = await request(app).delete('/movies/not-an-id').set(asAdmin());

      expect(res.status).toBe(400);
    });
  });

  describe('permissions', () => {
    let movieId: string;
    beforeEach(async () => {
      movieId = (await Movie.create(savedMovieData())).id;
    });

    // Each write endpoint, as a function that builds the request (without a token).
    const writeRequests = [
      ['POST /movies', () => request(app).post('/movies').send(movieData({ title: 'New' }))],
      ['PATCH /movies/:id', () => request(app).patch(`/movies/${movieId}`).send({ title: 'New' })],
      ['DELETE /movies/:id', () => request(app).delete(`/movies/${movieId}`)],
    ] as const;

    // The database must look exactly as before: one movie, unchanged.
    const expectNothingChanged = async () => {
      const movies = await Movie.find();
      expect(movies).toHaveLength(1);
      expect(movies[0].title).toBe('Inception');
    };

    it.each(writeRequests)('%s returns 401 without a token', async (_name, send) => {
      const res = await send();

      expect(res.status).toBe(401);
      await expectNothingChanged();
    });

    it.each(writeRequests)('%s returns 401 with an invalid token', async (_name, send) => {
      const res = await send().set('Authorization', 'Bearer not-a-real-token');

      expect(res.status).toBe(401);
      await expectNothingChanged();
    });

    it.each(writeRequests)('%s returns 403 for a regular user', async (_name, send) => {
      const { token } = await getToken('user');

      const res = await send().set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      await expectNothingChanged();
    });

    it('GET endpoints work without a token', async () => {
      expect((await request(app).get('/movies')).status).toBe(200);
      expect((await request(app).get(`/movies/${movieId}`)).status).toBe(200);
    });
  });
});
