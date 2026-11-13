import { isValidObjectId, QueryFilter } from 'mongoose';
import { IMovie, Movie } from '../models/movie.model';
import { BadRequestError, NotFoundError } from '../utils/errors';

export interface MovieFilters {
  title?: string;
  genre?: string;
  year?: number;
  director?: string;
}

// Only these fields can come from the client. reviewsCount and averageRating
// are calculated by the system, so they are never copied from the input.
const EDITABLE_FIELDS = [
  'title',
  'releaseYear',
  'genres',
  'director',
  'actors',
  'description',
] as const;

const pickEditableFields = (input: Record<string, unknown>): Partial<IMovie> => {
  const result: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (input[field] !== undefined) {
      result[field] = input[field];
    }
  }
  return result as Partial<IMovie>;
};

// Escapes characters like ( . * so they are searched as plain text, not as regex syntax.
const escapeRegex = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Whole-value match that ignores case: "sci-fi" matches "Sci-Fi", but "sci" doesn't.
const equalsIgnoreCase = (text: string) => ({
  $regex: `^${escapeRegex(text)}$`,
  $options: 'i',
});

const assertValidId = (id: string): void => {
  if (!isValidObjectId(id)) {
    throw new BadRequestError('Invalid movie id');
  }
};

const movieNotFound = () => new NotFoundError('Movie not found');

export const listMovies = async (filters: MovieFilters) => {
  const query: QueryFilter<IMovie> = {};

  if (filters.title) {
    query.title = { $regex: escapeRegex(filters.title), $options: 'i' };
  }
  if (filters.genre) {
    query.genres = equalsIgnoreCase(filters.genre); // matches if any item in the array matches
  }
  if (filters.year !== undefined) {
    query.releaseYear = filters.year;
  }
  if (filters.director) {
    query.director = equalsIgnoreCase(filters.director);
  }

  return Movie.find(query).sort({ title: 1 });
};

export const getMovieById = async (id: string) => {
  assertValidId(id);
  const movie = await Movie.findById(id);
  if (!movie) {
    throw movieNotFound();
  }
  return movie;
};

export const createMovie = async (input: Record<string, unknown>) => {
  return Movie.create(pickEditableFields(input));
};

export const updateMovie = async (id: string, input: Record<string, unknown>) => {
  assertValidId(id);
  const movie = await Movie.findByIdAndUpdate(id, pickEditableFields(input), {
    new: true, // return the movie after the update, not before
    runValidators: true, // without this, Mongoose skips validation on updates
  });
  if (!movie) {
    throw movieNotFound();
  }
  return movie;
};

export const deleteMovie = async (id: string): Promise<void> => {
  assertValidId(id);
  const movie = await Movie.findByIdAndDelete(id);
  if (!movie) {
    throw movieNotFound();
  }
};
