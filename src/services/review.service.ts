import { isValidObjectId } from 'mongoose';
import { AuthUser } from '../middleware/auth.middleware';
import { IReview, Review } from '../models/review.model';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../utils/errors';
import { getMovieById, updateMovieStats } from './movie.service';

// Only these fields can come from the client. movieId comes from the URL
// and userId from the JWT, so they are never copied from the input.
const EDITABLE_FIELDS = ['rating', 'text'] as const;

const pickEditableFields = (input: Record<string, unknown>): Partial<IReview> => {
  const result: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (input[field] !== undefined) {
      result[field] = input[field];
    }
  }
  return result as Partial<IReview>;
};

const reviewNotFound = () => new NotFoundError('Review not found');
const alreadyReviewed = () => new ConflictError('You already reviewed this movie');

const isDuplicateKeyError = (error: unknown) =>
  error instanceof Error && 'code' in error && error.code === 11000;

// Finds a review, or throws 400 (invalid id) / 404 (no such review).
const findReview = async (id: string) => {
  if (!isValidObjectId(id)) {
    throw new BadRequestError('Invalid review id');
  }
  const review = await Review.findById(id);
  if (!review) {
    throw reviewNotFound();
  }
  return review;
};

const isAuthor = (review: IReview, user: AuthUser) => review.userId.toString() === user.id;

export const listReviews = async (movieId: string) => {
  await getMovieById(movieId); // 400 for an invalid id, 404 if the movie doesn't exist

  return (
    Review.find({ movieId })
      .sort({ createdAt: -1, _id: -1 }) // newest first
      // Replaces userId with { _id, username } from the users collection. Only username is
      // requested, so the password could never be included.
      .populate('userId', 'username')
  );
};

export const createReview = async (
  movieId: string,
  userId: string,
  input: Record<string, unknown>,
) => {
  await getMovieById(movieId);

  // Gives a clear 409 in the normal case. The unique index below is what really
  // guarantees one review per user per movie.
  if (await Review.exists({ movieId, userId })) {
    throw alreadyReviewed();
  }

  let review;
  try {
    review = await Review.create({ ...pickEditableFields(input), movieId, userId });
  } catch (error) {
    // Two requests from the same user at the same moment can both pass the check above.
    // The unique index rejects the second one, before the stats are touched.
    if (isDuplicateKeyError(error)) {
      throw alreadyReviewed();
    }
    throw error;
  }

  await updateMovieStats(movieId, 1, review.rating);
  return review;
};

export const updateReview = async (
  reviewId: string,
  user: AuthUser,
  input: Record<string, unknown>,
) => {
  const review = await findReview(reviewId);
  if (!isAuthor(review, user)) {
    throw new ForbiddenError('Only the author can edit this review');
  }

  // Apply the changes to the document and validate it first. This gives a 400 for bad
  // data before anything is written, and turns values like "9" into the number 9.
  const changes = pickEditableFields(input);
  review.set(changes);
  await review.validate();

  // Write only the changed fields. findOneAndUpdate returns the review as it was
  // just before this update (new: false), in the same atomic step, so the old
  // rating is exactly the one this update replaced, even if another edit ran at the same time.
  const newValues: Partial<IReview> = {};
  for (const field of Object.keys(changes) as (keyof IReview)[]) {
    Object.assign(newValues, { [field]: review.get(field) });
  }
  const before = await Review.findOneAndUpdate({ _id: reviewId }, newValues, { new: false });
  if (!before) {
    throw reviewNotFound(); // deleted in the meantime
  }

  if (newValues.rating !== undefined && newValues.rating !== before.rating) {
    await updateMovieStats(before.movieId, 0, newValues.rating - before.rating);
  }

  return (await Review.findById(reviewId))!;
};

export const deleteReview = async (reviewId: string, user: AuthUser): Promise<void> => {
  const review = await findReview(reviewId);
  if (!isAuthor(review, user) && user.role !== 'admin') {
    throw new ForbiddenError('Only the author or an admin can delete this review');
  }

  // Returns the deleted review, or null if another request deleted it first.
  // So the rating is subtracted from the stats exactly once.
  const deleted = await Review.findOneAndDelete({ _id: reviewId });
  if (!deleted) {
    throw reviewNotFound();
  }

  await updateMovieStats(deleted.movieId, -1, -deleted.rating);
};
