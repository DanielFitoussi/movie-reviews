import { Review } from '../../src/models/review.model';

const validReview = () => ({
  movieId: '64b7f0000000000000000001',
  userId: '64b7f0000000000000000002',
  rating: 8,
  text: 'Great movie.',
});

describe('Review model', () => {
  it('accepts a valid review', async () => {
    await expect(new Review(validReview()).validate()).resolves.toBeUndefined();
  });

  it.each(['movieId', 'userId', 'rating', 'text'])('requires %s', async (field) => {
    const data: Record<string, unknown> = validReview();
    delete data[field];

    const error = await new Review(data).validate().catch((e) => e);

    expect(error?.errors[field]).toBeDefined();
  });

  it.each([1, 10])('accepts rating %p', async (rating) => {
    await expect(new Review({ ...validReview(), rating }).validate()).resolves.toBeUndefined();
  });

  it.each([0, 11, 7.5])('rejects rating %p', async (rating) => {
    const error = await new Review({ ...validReview(), rating }).validate().catch((e) => e);

    expect(error?.errors.rating).toBeDefined();
  });

  it('trims the text', () => {
    expect(new Review({ ...validReview(), text: '  Great.  ' }).text).toBe('Great.');
  });

  it('rejects text that is only spaces', async () => {
    const error = await new Review({ ...validReview(), text: '   ' }).validate().catch((e) => e);

    expect(error?.errors.text).toBeDefined();
  });
});
