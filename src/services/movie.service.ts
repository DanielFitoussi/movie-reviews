import { isValidObjectId, QueryFilter, Types } from 'mongoose';
import { IMovie, Movie } from '../models/movie.model';
import { Review } from '../models/review.model';
import { BadRequestError, NotFoundError } from '../utils/errors';

export interface MovieFilters {
  title?: string;
  genre?: string;
  year?: number;
  director?: string;
}

// Only these fields can come from the client. reviewsCount and averageRating
// are calculated by the system, and createdBy comes from the JWT,
// so they are never copied from the input.
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

// userId is the logged-in admin, taken from the JWT by the controller.
export const createMovie = async (input: Record<string, unknown>, userId: string) => {
  return Movie.create({ ...pickEditableFields(input), createdBy: userId });
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
  // Cascade delete: a movie's reviews can't exist without it.
  await Review.deleteMany({ movieId: id });
};

// Changes a movie's stats after a review is created, edited or deleted:
//   create: (+1, +rating)   edit: (0, newRating - oldRating)   delete: (-1, -rating)
//
// Everything happens in ONE update, and MongoDB applies a single-document update
// atomically. So even when many reviews arrive at the same time, each update starts
// from the latest values and none is lost. (Reading the movie in Node, computing,
// and saving would let two requests both read count=0 and both write count=1.)
//
// The update is a "pipeline": its stages run in order inside MongoDB,
// and the second stage sees the values the first stage just set.
export const updateMovieStats = async (
  movieId: Types.ObjectId | string,
  countDelta: number,
  ratingDelta: number,
): Promise<void> => {
  await Movie.updateOne(
    { _id: movieId },
    [
      {
        $set: {
          reviewsCount: { $add: ['$reviewsCount', countDelta] },
          ratingsSum: { $add: [{ $ifNull: ['$ratingsSum', 0] }, ratingDelta] },
        },
      },
      {
        $set: {
          averageRating: {
            $cond: [
              { $eq: ['$reviewsCount', 0] },
              0,
              // Round to one decimal, halves up: floor(sum * 10 / count + 0.5) / 10.
              // sum * 10 / count (not sum / count * 10) keeps a result like 72.5 exact.
              // MongoDB's $round would round halves to even (7.25 -> 7.2).
              {
                $divide: [
                  {
                    $floor: {
                      $add: [
                        { $divide: [{ $multiply: ['$ratingsSum', 10] }, '$reviewsCount'] },
                        0.5,
                      ],
                    },
                  },
                  10,
                ],
              },
            ],
          },
        },
      },
    ],
    { updatePipeline: true }, // Mongoose 9 only accepts a pipeline with this option
  );
};
