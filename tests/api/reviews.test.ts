import request from 'supertest';
import app from '../../src/app';
import { Movie } from '../../src/models/movie.model';
import { Review } from '../../src/models/review.model';
import { getToken } from '../setup/auth';
import { useTestDatabase } from '../setup/db';

useTestDatabase();

beforeAll(async () => {
  await Review.init(); // wait for the unique index, for the 409 tests
});

type LoggedIn = Awaited<ReturnType<typeof getToken>>;

const missingId = '64b7f0000000000000000000';
const bearer = (who: LoggedIn) => ({ Authorization: `Bearer ${who.token}` });

let movieId: string;
let author: LoggedIn;
beforeEach(async () => {
  author = await getToken('user');
  movieId = (
    await Movie.create({
      title: 'Inception',
      releaseYear: 2010,
      genres: ['Sci-Fi'],
      director: 'Christopher Nolan',
      actors: ['Leonardo DiCaprio'],
      description: 'A thief who steals secrets through dreams.',
      createdBy: missingId,
    })
  ).id;
});

// Creates a review through the API, as `who`.
const postReview = (who: LoggedIn, body: Record<string, unknown> = { rating: 8, text: 'Great' }) =>
  request(app).post(`/movies/${movieId}/reviews`).set(bearer(who)).send(body);

// The movie stats, as any client sees them.
const movieStats = async () => {
  const res = await request(app).get(`/movies/${movieId}`);
  return { reviewsCount: res.body.reviewsCount, averageRating: res.body.averageRating };
};

describe('Reviews API', () => {
  describe('GET /movies/:id/reviews', () => {
    it('is public and returns the reviews with the author username', async () => {
      await postReview(author);

      const res = await request(app).get(`/movies/${movieId}/reviews`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({
        movieId,
        rating: 8,
        text: 'Great',
        userId: { _id: author.user.id, username: author.user.username },
      });
      expect(JSON.stringify(res.body)).not.toContain('password');
    });

    it('returns 404 when the movie does not exist', async () => {
      const res = await request(app).get(`/movies/${missingId}/reviews`);

      expect(res.status).toBe(404);
    });

    it('returns 400 for an invalid movie id', async () => {
      const res = await request(app).get('/movies/not-an-id/reviews');

      expect(res.status).toBe(400);
    });
  });

  describe('POST /movies/:id/reviews', () => {
    it('returns 201 and the review, with userId from the token', async () => {
      const res = await postReview(author, { rating: 8, text: 'Great', userId: missingId });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ movieId, userId: author.user.id, rating: 8, text: 'Great' });
    });

    it('updates the movie stats', async () => {
      await postReview(author, { rating: 8, text: 'Great' });
      await postReview(await getToken('user'), { rating: 5, text: 'OK' });

      expect(await movieStats()).toEqual({ reviewsCount: 2, averageRating: 6.5 });
    });

    it('returns 401 without a token', async () => {
      const res = await request(app)
        .post(`/movies/${movieId}/reviews`)
        .send({ rating: 8, text: 'Great' });

      expect(res.status).toBe(401);
      expect(await Review.countDocuments()).toBe(0);
    });

    it('returns 409 when the user already reviewed the movie', async () => {
      await postReview(author);

      const res = await postReview(author, { rating: 3, text: 'Changed my mind' });

      expect(res.status).toBe(409);
      expect(await movieStats()).toEqual({ reviewsCount: 1, averageRating: 8 });
    });

    it.each([
      ['rating is missing', { text: 'Great' }],
      ['rating is above 10', { rating: 11, text: 'Great' }],
      ['rating is not an integer', { rating: 7.5, text: 'Great' }],
      ['text is missing', { rating: 8 }],
      ['text is only spaces', { rating: 8, text: '   ' }],
    ])('returns 400 when %s', async (_case, body) => {
      const res = await postReview(author, body);

      expect(res.status).toBe(400);
      expect(await movieStats()).toEqual({ reviewsCount: 0, averageRating: 0 });
    });

    it('returns 404 when the movie does not exist', async () => {
      const res = await request(app)
        .post(`/movies/${missingId}/reviews`)
        .set(bearer(author))
        .send({ rating: 8, text: 'Great' });

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /reviews/:id', () => {
    let reviewId: string;
    beforeEach(async () => {
      reviewId = (await postReview(author, { rating: 8, text: 'Great' })).body._id;
    });

    it('returns 200 and the updated review, and updates the stats', async () => {
      const res = await request(app)
        .patch(`/reviews/${reviewId}`)
        .set(bearer(author))
        .send({ rating: 4 });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ rating: 4, text: 'Great' });
      expect(await movieStats()).toEqual({ reviewsCount: 1, averageRating: 4 });
    });

    it('returns 401 without a token', async () => {
      const res = await request(app).patch(`/reviews/${reviewId}`).send({ rating: 4 });

      expect(res.status).toBe(401);
    });

    it.each(['user', 'admin'] as const)('returns 403 for a %s who is not the author', async (role) => {
      const other = await getToken(role);

      const res = await request(app)
        .patch(`/reviews/${reviewId}`)
        .set(bearer(other))
        .send({ rating: 1 });

      expect(res.status).toBe(403);
      expect((await Review.findById(reviewId))!.rating).toBe(8);
    });

    it('returns 400 for invalid data', async () => {
      const res = await request(app)
        .patch(`/reviews/${reviewId}`)
        .set(bearer(author))
        .send({ rating: 0 });

      expect(res.status).toBe(400);
      expect(await movieStats()).toEqual({ reviewsCount: 1, averageRating: 8 });
    });

    it('returns 404 when the review does not exist', async () => {
      const res = await request(app)
        .patch(`/reviews/${missingId}`)
        .set(bearer(author))
        .send({ rating: 4 });

      expect(res.status).toBe(404);
    });

    it('returns 400 for an invalid id', async () => {
      const res = await request(app)
        .patch('/reviews/not-an-id')
        .set(bearer(author))
        .send({ rating: 4 });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /reviews/:id', () => {
    let reviewId: string;
    beforeEach(async () => {
      reviewId = (await postReview(author, { rating: 8, text: 'Great' })).body._id;
    });

    it('returns 204 for the author and updates the stats', async () => {
      const res = await request(app).delete(`/reviews/${reviewId}`).set(bearer(author));

      expect(res.status).toBe(204);
      expect(await Review.countDocuments()).toBe(0);
      expect(await movieStats()).toEqual({ reviewsCount: 0, averageRating: 0 });
    });

    it('returns 204 for an admin', async () => {
      const admin = await getToken('admin');

      const res = await request(app).delete(`/reviews/${reviewId}`).set(bearer(admin));

      expect(res.status).toBe(204);
      expect(await Review.countDocuments()).toBe(0);
    });

    it('returns 401 without a token', async () => {
      const res = await request(app).delete(`/reviews/${reviewId}`);

      expect(res.status).toBe(401);
    });

    it('returns 403 for another regular user', async () => {
      const other = await getToken('user');

      const res = await request(app).delete(`/reviews/${reviewId}`).set(bearer(other));

      expect(res.status).toBe(403);
      expect(await Review.countDocuments()).toBe(1);
    });

    it('returns 404 when the review does not exist', async () => {
      const res = await request(app).delete(`/reviews/${missingId}`).set(bearer(author));

      expect(res.status).toBe(404);
    });

    it('returns 400 for an invalid id', async () => {
      const res = await request(app).delete('/reviews/not-an-id').set(bearer(author));

      expect(res.status).toBe(400);
    });
  });
});
