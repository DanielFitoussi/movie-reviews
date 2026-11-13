import { Schema, Types, model } from 'mongoose';

export interface IMovie {
  title: string;
  releaseYear: number;
  genres: string[];
  director: string;
  actors: string[];
  description: string;
  reviewsCount: number;
  averageRating: number;
  ratingsSum: number;
  createdBy: Types.ObjectId;
}

// First film ever made was in 1888; allow a few years ahead for announced movies.
const MIN_YEAR = 1888;
const maxYear = () => new Date().getFullYear() + 5;

const nonEmptyArray = {
  validator: (value: string[]) => Array.isArray(value) && value.length > 0,
  message: '{PATH} must contain at least one item',
};

const movieSchema = new Schema<IMovie>(
  {
    title: { type: String, required: true, trim: true },
    releaseYear: {
      type: Number,
      required: true,
      min: MIN_YEAR,
      validate: [
        { validator: Number.isInteger, message: 'releaseYear must be an integer' },
        {
          validator: (year: number) => year <= maxYear(),
          message: 'releaseYear is too far in the future',
        },
      ],
    },
    genres: {
      type: [{ type: String, trim: true }],
      required: true,
      validate: nonEmptyArray,
    },
    director: { type: String, required: true, trim: true },
    actors: {
      type: [{ type: String, trim: true }],
      required: true,
      validate: nonEmptyArray,
    },
    description: { type: String, required: true, trim: true },
    reviewsCount: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    // The exact sum of all ratings. averageRating is rounded, so it can't be used to
    // recompute the average; this can. Internal only: select: false keeps it out of
    // query results, and the toJSON transform below removes it from responses.
    ratingsSum: { type: Number, default: 0, select: false },
    // The admin who created the movie. ref tells Mongoose this id points to a User.
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
    toJSON: {
      // A newly created movie still has ratingsSum loaded (select: false only affects queries).
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.ratingsSum;
        return ret;
      },
    },
  },
);

export const Movie = model<IMovie>('Movie', movieSchema);
