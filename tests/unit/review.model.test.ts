import { Review } from '../../src/models/review.model';

const validReview = () => ({
  movieId: '64b7f0000000000000000001',
  userId: '64b7f0000000000000000002',
  rating: 8,
  text: 'Great movie.',
});

describe('Review model', () => {
  it('accepts a valid review', () => {
    expect(new Review(validReview()).validateSync()).toBeUndefined();
  });

  it.each(['movieId', 'userId', 'rating', 'text'])('requires %s', (field) => {
    const data: Record<string, unknown> = validReview();
    delete data[field];

    const error = new Review(data).validateSync();

    expect(error?.errors[field]).toBeDefined();
  });

  it.each([1, 10])('accepts rating %p', (rating) => {
    expect(new Review({ ...validReview(), rating }).validateSync()).toBeUndefined();
  });

  it.each([0, 11, 7.5])('rejects rating %p', (rating) => {
    const error = new Review({ ...validReview(), rating }).validateSync();

    expect(error?.errors.rating).toBeDefined();
  });

  it('trims the text', () => {
    expect(new Review({ ...validReview(), text: '  Great.  ' }).text).toBe('Great.');
  });

  it('rejects text that is only spaces', () => {
    const error = new Review({ ...validReview(), text: '   ' }).validateSync();

    expect(error?.errors.text).toBeDefined();
  });
});
