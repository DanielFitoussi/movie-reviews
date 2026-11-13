import { Schema, Types, model } from 'mongoose';

export interface IReview {
  movieId: Types.ObjectId;
  userId: Types.ObjectId;
  rating: number;
  text: string;
}

const reviewSchema = new Schema<IReview>(
  {
    movieId: { type: Schema.Types.ObjectId, ref: 'Movie', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
      validate: { validator: Number.isInteger, message: 'rating must be an integer' },
    },
    text: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

// One review per user per movie. The database itself rejects a second one,
// even if two requests arrive at the same moment.
reviewSchema.index({ movieId: 1, userId: 1 }, { unique: true });

export const Review = model<IReview>('Review', reviewSchema);
