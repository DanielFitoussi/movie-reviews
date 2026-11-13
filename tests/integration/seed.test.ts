import bcrypt from 'bcryptjs';
import { Movie } from '../../src/models/movie.model';
import { Review } from '../../src/models/review.model';
import { User } from '../../src/models/user.model';
import { seed } from '../../src/scripts/seed';
import { createUser } from '../setup/auth';
import { useTestDatabase } from '../setup/db';

useTestDatabase();

const admin = { username: 'boss', password: 'admin-password' };

describe('seed', () => {
  // The seed creates reviews, which rely on the unique { movieId, userId } index.
  beforeAll(async () => {
    await Review.init();
  });

  it('creates the admin from the given credentials, with a hashed password', async () => {
    await seed(admin);

    const saved = await User.findOne({ username: 'boss' }).select('+password');
    expect(saved).not.toBeNull();
    expect(saved!.role).toBe('admin');
    expect(saved!.password).not.toBe(admin.password);
    expect(await bcrypt.compare(admin.password, saved!.password)).toBe(true);
  });

  it('creates regular users, movies and reviews', async () => {
    await seed(admin);

    expect(await User.countDocuments({ role: 'user' })).toBeGreaterThan(0);
    expect(await Movie.countDocuments()).toBeGreaterThan(0);
    expect(await Review.countDocuments()).toBeGreaterThan(0);
  });

  // The assignment requires at least 10 movies and at least 30 reviews.
  it('creates at least 10 movies and at least 30 reviews', async () => {
    await seed(admin);

    expect(await Movie.countDocuments()).toBeGreaterThanOrEqual(10);
    expect(await Review.countDocuments()).toBeGreaterThanOrEqual(30);
  });

  it('gives every movie stats that match its reviews', async () => {
    await seed(admin);

    const movies = await Movie.find().select('+ratingsSum');
    for (const movie of movies) {
      const reviews = await Review.find({ movieId: movie._id });
      const sum = reviews.reduce((total, review) => total + review.rating, 0);
      const average = reviews.length === 0 ? 0 : Math.round((sum * 10) / reviews.length) / 10;

      expect(movie.reviewsCount).toBe(reviews.length);
      expect(movie.ratingsSum).toBe(sum);
      expect(movie.averageRating).toBe(average);
    }
  });

  it('deletes existing data first (reset)', async () => {
    const oldUser = await createUser('user', 'old-user');

    await seed(admin);

    expect(await User.findById(oldUser._id)).toBeNull();
  });

  it('gives the same result when run twice', async () => {
    await seed(admin);
    const counts = [
      await User.countDocuments(),
      await Movie.countDocuments(),
      await Review.countDocuments(),
    ];

    await seed(admin);

    expect([
      await User.countDocuments(),
      await Movie.countDocuments(),
      await Review.countDocuments(),
    ]).toEqual(counts);
  });
});
