import { Request, Response } from 'express';
import * as reviewService from '../services/review.service';

// Express 5 route params are always strings, but the type allows string[] for wildcards.
const readId = (req: Request): string => String(req.params.id);

// In GET/POST /movies/:id/reviews, :id is the movie id.
export const listReviews = async (req: Request, res: Response): Promise<void> => {
  const reviews = await reviewService.listReviews(readId(req));
  res.status(200).json(reviews);
};

// req.user is always set in the handlers below, because their routes run `authenticate` first.
export const createReview = async (req: Request, res: Response): Promise<void> => {
  const review = await reviewService.createReview(readId(req), req.user!.id, req.body ?? {});
  res.status(201).json(review);
};

// In PATCH/DELETE /reviews/:id, :id is the review id.
export const updateReview = async (req: Request, res: Response): Promise<void> => {
  const review = await reviewService.updateReview(readId(req), req.user!, req.body ?? {});
  res.status(200).json(review);
};

export const deleteReview = async (req: Request, res: Response): Promise<void> => {
  await reviewService.deleteReview(readId(req), req.user!);
  res.status(204).send();
};
