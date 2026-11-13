import { Movie } from '../../src/models/movie.model';

const validMovie = () => ({
  title: 'Inception',
  releaseYear: 2010,
  genres: ['Sci-Fi', 'Thriller'],
  director: 'Christopher Nolan',
  actors: ['Leonardo DiCaprio', 'Joseph Gordon-Levitt'],
  description: 'A thief who steals secrets through dreams.',
  createdBy: '64b7f0000000000000000001',
});

describe('Movie model', () => {
  it('accepts a valid movie', async () => {
    const movie = new Movie(validMovie());

    await expect(movie.validate()).resolves.toBeUndefined();
  });

  it('sets reviewsCount and averageRating to 0 by default', () => {
    const movie = new Movie(validMovie());

    expect(movie.reviewsCount).toBe(0);
    expect(movie.averageRating).toBe(0);
  });

  it('trims string fields', () => {
    const movie = new Movie({ ...validMovie(), title: '  Inception  ' });

    expect(movie.title).toBe('Inception');
  });

  it.each(['title', 'releaseYear', 'genres', 'director', 'actors', 'description', 'createdBy'])(
    'requires %s',
    async (field) => {
      const data: Record<string, unknown> = validMovie();
      delete data[field];

      const error = await new Movie(data).validate().catch((e) => e);

      expect(error?.errors[field]).toBeDefined();
    },
  );

  it('rejects a title that is only spaces', async () => {
    const error = await new Movie({ ...validMovie(), title: '   ' }).validate().catch((e) => e);

    expect(error?.errors.title).toBeDefined();
  });

  it.each(['genres', 'actors'])('rejects an empty %s array', async (field) => {
    const error = await new Movie({ ...validMovie(), [field]: [] }).validate().catch((e) => e);

    expect(error?.errors[field]).toBeDefined();
  });

  it.each([1887, 2010.5, new Date().getFullYear() + 6])(
    'rejects releaseYear %p',
    async (year) => {
      const error = await new Movie({ ...validMovie(), releaseYear: year }).validate().catch((e) => e);

      expect(error?.errors.releaseYear).toBeDefined();
    },
  );
});
