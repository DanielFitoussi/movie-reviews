import { Request, Response } from 'express';
import * as movieService from '../services/movie.service';
import { BadRequestError } from '../utils/errors';

// Query values can be a string, an array (?genre=a&genre=b) or missing.
// We only accept a single string.
const readQueryString = (req: Request, name: string): string | undefined => {
  const value = req.query[name];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new BadRequestError(`Query parameter "${name}" must be a single value`);
  }
  return value;
};

const readQueryYear = (req: Request): number | undefined => {
  const value = readQueryString(req, 'year');
  if (value === undefined) {
    return undefined;
  }
  const year = Number(value);
  if (!Number.isInteger(year)) {
    throw new BadRequestError('Query parameter "year" must be an integer');
  }
  return year;
};

// Express 5 route params are always strings, but the type allows string[] for wildcards.
const readId = (req: Request): string => String(req.params.id);

export const listMovies = async (req: Request, res: Response): Promise<void> => {
  const movies = await movieService.listMovies({
    title: readQueryString(req, 'title'),
    genre: readQueryString(req, 'genre'),
    year: readQueryYear(req),
    director: readQueryString(req, 'director'),
  });
  res.status(200).json(movies);
};

export const getMovie = async (req: Request, res: Response): Promise<void> => {
  const movie = await movieService.getMovieById(readId(req));
  res.status(200).json(movie);
};

export const createMovie = async (req: Request, res: Response): Promise<void> => {
  const movie = await movieService.createMovie(req.body ?? {});
  res.status(201).json(movie);
};

export const updateMovie = async (req: Request, res: Response): Promise<void> => {
  const movie = await movieService.updateMovie(readId(req), req.body ?? {});
  res.status(200).json(movie);
};

export const deleteMovie = async (req: Request, res: Response): Promise<void> => {
  await movieService.deleteMovie(readId(req));
  res.status(204).send();
};
