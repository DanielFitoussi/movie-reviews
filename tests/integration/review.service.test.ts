import { Movie } from '../../src/models/movie.model';
import { Review } from '../../src/models/review.model';
import * as reviewService from '../../src/services/review.service';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../src/utils/errors';
import { createUser } from '../setup/auth';
import { useTestDatabase } from '../setup/db';

useTestDatabase();

// The unique index on { movieId, userId } is built in the background when the
// model is first used. Waiting for it makes the duplicate tests reliable.
beforeAll(async () => {
  await Review.init();
});

const missingId = '64b7f0000000000000000000';

const createMovie = () =>
  Movie.create({
    title: 'Inception',
    releaseYear: 2010,
    genres: ['Sci-Fi'],
    director: 'Christopher Nolan',
    actors: ['Leonardo DiCaprio'],
    description: 'A thief who steals secrets through dreams.',
    createdBy: missingId,
  });

// The logged-in user, as `authenticate` puts it on req.user.
const asUser = (user: { id: string; role: 'user' | 'admin' }) => ({ id: user.id, role: user.role });

// Reads the movie's stats straight from the database, including the hidden ratingsSum.
const statsOf = async (movieId: string) => {
  const movie = await Movie.findById(movieId).select('+ratingsSum');
  return {
    reviewsCount: movie!.reviewsCount,
    averageRating: movie!.averageRating,
    ratingsSum: movie!.get('ratingsSum'),
  };
};

// Creates one review per rating, each by a different user.
const addReviews = async (movieId: string, ratings: number[]) => {
  const reviews = [];
  for (const rating of ratings) {
    const user = await createUser();
    reviews.push(await reviewService.createReview(movieId, user.id, { rating, text: 'Text' }));
  }
  return reviews;
};

describe('review.service', () => {
  let movieId: string;
  beforeEach(async () => {
    movieId = (await createMovie()).id;
  });

  describe('createReview', () => {
    it('saves the review with movieId and userId', async () => {
      const user = await createUser();

      const review = await reviewService.createReview(movieId, user.id, {
        rating: 8,
        text: 'Great',
      });

      expect(review.movieId.toString()).toBe(movieId);
      expect(review.userId.toString()).toBe(user.id);
      expect(review.rating).toBe(8);
    });

    it('ignores movieId and userId from the input', async () => {
      const user = await createUser();

      const review = await reviewService.createReview(movieId, user.id, {
        rating: 8,
        text: 'Great',
        movieId: missingId,
        userId: missingId,
      });

      expect(review.movieId.toString()).toBe(movieId);
      expect(review.userId.toString()).toBe(user.id);
    });

    it('updates the movie stats', async () => {
      await addReviews(movieId, [8, 7]);

      expect(await statsOf(movieId)).toEqual({
        reviewsCount: 2,
        averageRating: 7.5,
        ratingsSum: 15,
      });
    });

    it('rounds the average to one decimal', async () => {
      await addReviews(movieId, [7, 7, 8]); // 7.333...

      expect((await statsOf(movieId)).averageRating).toBe(7.3);
    });

    it('rounds a half up', async () => {
      await addReviews(movieId, [8, 7, 7, 7]); // 7.25

      expect((await statsOf(movieId)).averageRating).toBe(7.3);
    });

    it('keeps the stats correct when many reviews are created at the same time', async () => {
      const users = await Promise.all(Array.from({ length: 10 }, () => createUser()));
      const ratings = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      await Promise.all(
        users.map((user, i) =>
          reviewService.createReview(movieId, user.id, { rating: ratings[i], text: 'Text' }),
        ),
      );

      expect(await statsOf(movieId)).toEqual({
        reviewsCount: 10,
        averageRating: 5.5,
        ratingsSum: 55,
      });
    });

    it('throws ConflictError when the user already reviewed the movie', async () => {
      const user = await createUser();
      await reviewService.createReview(movieId, user.id, { rating: 8, text: 'Great' });

      await expect(
        reviewService.createReview(movieId, user.id, { rating: 5, text: 'Again' }),
      ).rejects.toThrow(ConflictError);
      expect((await statsOf(movieId)).reviewsCount).toBe(1);
    });

    it('saves only one review when the same user sends two at the same time', async () => {
      const user = await createUser();

      const results = await Promise.allSettled([
        reviewService.createReview(movieId, user.id, { rating: 8, text: 'First' }),
        reviewService.createReview(movieId, user.id, { rating: 2, text: 'Second' }),
      ]);

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(await Review.countDocuments()).toBe(1);
      expect((await statsOf(movieId)).reviewsCount).toBe(1);
    });

    it('rejects invalid data without changing the stats', async () => {
      const user = await createUser();

      await expect(
        reviewService.createReview(movieId, user.id, { rating: 11, text: 'Too high' }),
      ).rejects.toThrow(/rating/);
      expect((await statsOf(movieId)).reviewsCount).toBe(0);
    });

    it('throws NotFoundError when the movie does not exist', async () => {
      const user = await createUser();

      await expect(
        reviewService.createReview(missingId, user.id, { rating: 8, text: 'Great' }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('listReviews', () => {
    it('returns the movie reviews, newest first, with the author username', async () => {
      const [first, second] = await addReviews(movieId, [8, 6]);
      // Make sure the order doesn't depend on two reviews saved in the same millisecond.
      // Mongoose won't change createdAt (it's immutable), so we use the raw collection.
      await Review.collection.updateOne(
        { _id: first._id },
        { $set: { createdAt: new Date('2020-01-01') } },
      );

      const reviews = await reviewService.listReviews(movieId);

      expect(reviews.map((r) => r.id)).toEqual([second.id, first.id]);
      expect(reviews[0].toJSON().userId).toEqual({
        _id: second.userId,
        username: expect.any(String),
      });
    });

    it('returns only the reviews of that movie', async () => {
      const otherMovie = await createMovie();
      await addReviews(movieId, [8]);
      await addReviews(otherMovie.id, [5]);

      expect(await reviewService.listReviews(movieId)).toHaveLength(1);
    });

    it('throws NotFoundError when the movie does not exist', async () => {
      await expect(reviewService.listReviews(missingId)).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateReview', () => {
    it('changes the rating and text and updates the stats', async () => {
      const [review] = await addReviews(movieId, [7, 8]);
      const author = { id: review.userId.toString(), role: 'user' as const };

      const updated = await reviewService.updateReview(review.id, author, {
        rating: 9,
        text: 'Even better',
      });

      expect(updated.rating).toBe(9);
      expect(updated.text).toBe('Even better');
      expect(await statsOf(movieId)).toEqual({
        reviewsCount: 2,
        averageRating: 8.5,
        ratingsSum: 17,
      });
    });

    it('keeps the stats when only the text changes', async () => {
      const [review] = await addReviews(movieId, [7]);
      const author = { id: review.userId.toString(), role: 'user' as const };

      await reviewService.updateReview(review.id, author, { text: 'New text' });

      expect(await statsOf(movieId)).toEqual({ reviewsCount: 1, averageRating: 7, ratingsSum: 7 });
    });

    it('ignores movieId and userId from the input', async () => {
      const [review] = await addReviews(movieId, [7]);
      const author = { id: review.userId.toString(), role: 'user' as const };

      const updated = await reviewService.updateReview(review.id, author, {
        movieId: missingId,
        userId: missingId,
      });

      expect(updated.movieId.toString()).toBe(movieId);
      expect(updated.userId.toString()).toBe(author.id);
    });

    it('rejects invalid data without changing the stats', async () => {
      const [review] = await addReviews(movieId, [7]);
      const author = { id: review.userId.toString(), role: 'user' as const };

      await expect(
        reviewService.updateReview(review.id, author, { rating: 0 }),
      ).rejects.toThrow(/rating/);
      expect(await statsOf(movieId)).toEqual({ reviewsCount: 1, averageRating: 7, ratingsSum: 7 });
    });

    it('throws ForbiddenError for another user', async () => {
      const [review] = await addReviews(movieId, [7]);
      const other = await createUser();

      await expect(
        reviewService.updateReview(review.id, asUser(other), { rating: 1 }),
      ).rejects.toThrow(ForbiddenError);
    });

    it('throws ForbiddenError for an admin who is not the author', async () => {
      const [review] = await addReviews(movieId, [7]);
      const admin = await createUser('admin');

      await expect(
        reviewService.updateReview(review.id, asUser(admin), { rating: 1 }),
      ).rejects.toThrow(ForbiddenError);
    });

    it('throws NotFoundError when the review does not exist', async () => {
      const user = await createUser();

      await expect(
        reviewService.updateReview(missingId, asUser(user), { rating: 1 }),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws BadRequestError for an invalid id', async () => {
      const user = await createUser();

      await expect(
        reviewService.updateReview('not-an-id', asUser(user), { rating: 1 }),
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('deleteReview', () => {
    it('removes the review and updates the stats', async () => {
      const [review] = await addReviews(movieId, [7, 9]);
      const author = { id: review.userId.toString(), role: 'user' as const };

      await reviewService.deleteReview(review.id, author);

      expect(await Review.countDocuments()).toBe(1);
      expect(await statsOf(movieId)).toEqual({ reviewsCount: 1, averageRating: 9, ratingsSum: 9 });
    });

    it('resets the stats to 0 when the last review is deleted', async () => {
      const [review] = await addReviews(movieId, [7]);
      const author = { id: review.userId.toString(), role: 'user' as const };

      await reviewService.deleteReview(review.id, author);

      expect(await statsOf(movieId)).toEqual({ reviewsCount: 0, averageRating: 0, ratingsSum: 0 });
    });

    it('lets an admin delete any review', async () => {
      const [review] = await addReviews(movieId, [7]);
      const admin = await createUser('admin');

      await reviewService.deleteReview(review.id, asUser(admin));

      expect(await Review.countDocuments()).toBe(0);
    });

    it('subtracts the review only once when it is deleted twice at the same time', async () => {
      const [review] = await addReviews(movieId, [7, 9]);
      const author = { id: review.userId.toString(), role: 'user' as const };

      await Promise.allSettled([
        reviewService.deleteReview(review.id, author),
        reviewService.deleteReview(review.id, author),
      ]);

      expect(await statsOf(movieId)).toEqual({ reviewsCount: 1, averageRating: 9, ratingsSum: 9 });
    });

    it('throws ForbiddenError for another regular user', async () => {
      const [review] = await addReviews(movieId, [7]);
      const other = await createUser();

      await expect(reviewService.deleteReview(review.id, asUser(other))).rejects.toThrow(
        ForbiddenError,
      );
      expect(await Review.countDocuments()).toBe(1);
    });

    it('throws NotFoundError when the review does not exist', async () => {
      const user = await createUser();

      await expect(reviewService.deleteReview(missingId, asUser(user))).rejects.toThrow(
        NotFoundError,
      );
    });
  });
});
