import { Movie } from '../../src/models/movie.model';
import * as movieService from '../../src/services/movie.service';
import { BadRequestError, NotFoundError } from '../../src/utils/errors';
import { useTestDatabase } from '../setup/db';

useTestDatabase();

// The admin who creates movies in these tests.
const adminId = '64b7f0000000000000000001';
const otherId = '64b7f0000000000000000002';

const movieData = (overrides: Record<string, unknown> = {}) => ({
  title: 'Inception',
  releaseYear: 2010,
  genres: ['Sci-Fi', 'Thriller'],
  director: 'Christopher Nolan',
  actors: ['Leonardo DiCaprio'],
  description: 'A thief who steals secrets through dreams.',
  ...overrides,
});

// For Movie.create(), which bypasses the service and so needs createdBy itself.
const savedMovieData = (overrides: Record<string, unknown> = {}) =>
  movieData({ createdBy: adminId, ...overrides });

const missingId = '64b7f0000000000000000000';

describe('movie.service', () => {
  describe('createMovie', () => {
    it('saves the movie with default stats', async () => {
      const movie = await movieService.createMovie(movieData(), adminId);

      expect(movie.title).toBe('Inception');
      expect(movie.reviewsCount).toBe(0);
      expect(await Movie.countDocuments()).toBe(1);
    });

    it('sets createdBy to the given user id', async () => {
      const movie = await movieService.createMovie(movieData(), adminId);

      expect(movie.createdBy.toString()).toBe(adminId);
    });

    it('ignores createdBy from the input', async () => {
      const movie = await movieService.createMovie(movieData({ createdBy: otherId }), adminId);

      expect(movie.createdBy.toString()).toBe(adminId);
    });

    it('ignores reviewsCount, averageRating and unknown fields from the input', async () => {
      const movie = await movieService.createMovie(
        movieData({ reviewsCount: 99, averageRating: 9.9, hacked: true }),
        adminId,
      );

      expect(movie.reviewsCount).toBe(0);
      expect(movie.averageRating).toBe(0);
      expect(movie.toObject()).not.toHaveProperty('hacked');
    });

    it('rejects invalid data', async () => {
      await expect(
        movieService.createMovie(movieData({ genres: [] }), adminId),
      ).rejects.toThrow(/genres/);
    });
  });

  describe('listMovies', () => {
    beforeEach(async () => {
      await Movie.create([
        savedMovieData(),
        savedMovieData({
          title: 'Interstellar',
          releaseYear: 2014,
          genres: ['Sci-Fi', 'Drama'],
        }),
        savedMovieData({
          title: 'Pulp Fiction',
          releaseYear: 1994,
          genres: ['Crime'],
          director: 'Quentin Tarantino',
        }),
      ]);
    });

    const titles = (movies: { title: string }[]) => movies.map((m) => m.title).sort();

    it('returns all movies when there are no filters', async () => {
      expect(await movieService.listMovies({})).toHaveLength(3);
    });

    it('searches title by partial, case-insensitive match', async () => {
      expect(titles(await movieService.listMovies({ title: 'INTER' }))).toEqual([
        'Interstellar',
      ]);
    });

    it('treats regex characters in the title search as plain text', async () => {
      await Movie.create(savedMovieData({ title: 'What (If)' }));

      expect(titles(await movieService.listMovies({ title: '(If)' }))).toEqual(['What (If)']);
      expect(await movieService.listMovies({ title: '.*' })).toHaveLength(0);
    });

    it('filters by genre', async () => {
      expect(titles(await movieService.listMovies({ genre: 'Sci-Fi' }))).toEqual([
        'Inception',
        'Interstellar',
      ]);
    });

    it('filters by genre case-insensitively', async () => {
      expect(titles(await movieService.listMovies({ genre: 'sci-fi' }))).toEqual([
        'Inception',
        'Interstellar',
      ]);
    });

    it('filters by year', async () => {
      expect(titles(await movieService.listMovies({ year: 1994 }))).toEqual(['Pulp Fiction']);
    });

    it('filters by director', async () => {
      expect(
        titles(await movieService.listMovies({ director: 'Christopher Nolan' })),
      ).toEqual(['Inception', 'Interstellar']);
    });

    it('filters by director case-insensitively', async () => {
      expect(titles(await movieService.listMovies({ director: 'quentin TARANTINO' }))).toEqual([
        'Pulp Fiction',
      ]);
    });

    it('combines filters with AND', async () => {
      expect(
        titles(await movieService.listMovies({ genre: 'Sci-Fi', year: 2014 })),
      ).toEqual(['Interstellar']);
    });
  });

  describe('getMovieById', () => {
    it('returns the movie', async () => {
      const created = await Movie.create(savedMovieData());

      const movie = await movieService.getMovieById(created.id);

      expect(movie.title).toBe('Inception');
    });

    it('throws NotFoundError when the movie does not exist', async () => {
      await expect(movieService.getMovieById(missingId)).rejects.toThrow(NotFoundError);
    });

    it('throws BadRequestError for an invalid id', async () => {
      await expect(movieService.getMovieById('not-an-id')).rejects.toThrow(BadRequestError);
    });
  });

  describe('updateMovie', () => {
    it('changes only the fields that were sent', async () => {
      const created = await Movie.create(savedMovieData());

      const movie = await movieService.updateMovie(created.id, { title: 'Inception 2' });

      expect(movie.title).toBe('Inception 2');
      expect(movie.director).toBe('Christopher Nolan');
    });

    it('validates the fields that were sent', async () => {
      const created = await Movie.create(savedMovieData());

      await expect(
        movieService.updateMovie(created.id, { releaseYear: 1500 }),
      ).rejects.toThrow(/releaseYear/);
    });

    it('ignores reviewsCount and averageRating', async () => {
      const created = await Movie.create(savedMovieData());

      const movie = await movieService.updateMovie(created.id, { reviewsCount: 50 });

      expect(movie.reviewsCount).toBe(0);
    });

    it('ignores createdBy', async () => {
      const created = await Movie.create(savedMovieData());

      const movie = await movieService.updateMovie(created.id, { createdBy: otherId });

      expect(movie.createdBy.toString()).toBe(adminId);
    });

    it('throws NotFoundError when the movie does not exist', async () => {
      await expect(movieService.updateMovie(missingId, { title: 'X' })).rejects.toThrow(
        NotFoundError,
      );
    });

    it('throws BadRequestError for an invalid id', async () => {
      await expect(movieService.updateMovie('not-an-id', { title: 'X' })).rejects.toThrow(
        BadRequestError,
      );
    });
  });

  describe('deleteMovie', () => {
    it('removes the movie', async () => {
      const created = await Movie.create(savedMovieData());

      await movieService.deleteMovie(created.id);

      expect(await Movie.countDocuments()).toBe(0);
    });

    it('throws NotFoundError when the movie does not exist', async () => {
      await expect(movieService.deleteMovie(missingId)).rejects.toThrow(NotFoundError);
    });

    it('throws BadRequestError for an invalid id', async () => {
      await expect(movieService.deleteMovie('not-an-id')).rejects.toThrow(BadRequestError);
    });
  });
});
