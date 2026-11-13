import { Schema, model } from 'mongoose';

export interface IMovie {
  title: string;
  releaseYear: number;
  genres: string[];
  director: string;
  actors: string[];
  description: string;
  reviewsCount: number;
  averageRating: number;
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
  },
  { timestamps: true },
);

export const Movie = model<IMovie>('Movie', movieSchema);
