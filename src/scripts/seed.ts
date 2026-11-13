import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { env } from '../config/env';
import { Movie } from '../models/movie.model';
import { Review } from '../models/review.model';
import { User } from '../models/user.model';
import { createReview } from '../services/review.service';

// Fills the database with sample data: an admin, a few users, movies and reviews.
// Run it with `npm run seed`. It DELETES all existing users, movies and reviews first.

// Shared password of the sample (non-admin) users. They are demo accounts only.
const DEMO_PASSWORD = 'password123';

const USERNAMES = ['dana', 'yossi', 'noa', 'avi', 'maya'];

const MOVIES = [
  {
    title: 'The Matrix',
    releaseYear: 1999,
    genres: ['Sci-Fi', 'Action'],
    director: 'Lana Wachowski',
    actors: ['Keanu Reeves', 'Laurence Fishburne', 'Carrie-Anne Moss'],
    description: 'A hacker learns that the world he lives in is a simulation.',
  },
  {
    title: 'Inception',
    releaseYear: 2010,
    genres: ['Sci-Fi', 'Thriller'],
    director: 'Christopher Nolan',
    actors: ['Leonardo DiCaprio', 'Joseph Gordon-Levitt', 'Elliot Page'],
    description: 'A thief steals secrets by entering people’s dreams.',
  },
  {
    title: 'The Godfather',
    releaseYear: 1972,
    genres: ['Crime', 'Drama'],
    director: 'Francis Ford Coppola',
    actors: ['Marlon Brando', 'Al Pacino', 'James Caan'],
    description: 'The aging head of a crime family hands control to his reluctant son.',
  },
  {
    title: 'Spirited Away',
    releaseYear: 2001,
    genres: ['Animation', 'Fantasy'],
    director: 'Hayao Miyazaki',
    actors: ['Rumi Hiiragi', 'Miyu Irino'],
    description: 'A girl is trapped in a world of spirits and must free her parents.',
  },
  {
    title: 'Parasite',
    releaseYear: 2019,
    genres: ['Thriller', 'Drama'],
    director: 'Bong Joon-ho',
    actors: ['Song Kang-ho', 'Choi Woo-shik', 'Park So-dam'],
    description: 'A poor family slowly works its way into a rich household.',
  },
  {
    title: 'Pulp Fiction',
    releaseYear: 1994,
    genres: ['Crime', 'Drama'],
    director: 'Quentin Tarantino',
    actors: ['John Travolta', 'Uma Thurman', 'Samuel L. Jackson'],
    description: 'The lives of two hitmen, a boxer and a gangster’s wife cross in Los Angeles.',
  },
  {
    title: 'The Dark Knight',
    releaseYear: 2008,
    genres: ['Action', 'Crime'],
    director: 'Christopher Nolan',
    actors: ['Christian Bale', 'Heath Ledger', 'Aaron Eckhart'],
    description: 'Batman faces the Joker, a criminal who wants to plunge Gotham into chaos.',
  },
  {
    title: 'Forrest Gump',
    releaseYear: 1994,
    genres: ['Drama', 'Romance'],
    director: 'Robert Zemeckis',
    actors: ['Tom Hanks', 'Robin Wright', 'Gary Sinise'],
    description: 'A kind, simple man witnesses decades of American history.',
  },
  {
    title: 'The Lion King',
    releaseYear: 1994,
    genres: ['Animation', 'Drama'],
    director: 'Roger Allers',
    actors: ['Matthew Broderick', 'James Earl Jones', 'Jeremy Irons'],
    description: 'A young lion prince flees his kingdom after his father’s death.',
  },
  {
    title: 'Interstellar',
    releaseYear: 2014,
    genres: ['Sci-Fi', 'Drama'],
    director: 'Christopher Nolan',
    actors: ['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain'],
    description: 'Astronauts travel through a wormhole to find a new home for humanity.',
  },
  {
    title: 'Amélie',
    releaseYear: 2001,
    genres: ['Comedy', 'Romance'],
    director: 'Jean-Pierre Jeunet',
    actors: ['Audrey Tautou', 'Mathieu Kassovitz'],
    description: 'A shy waitress in Paris decides to secretly help the people around her.',
  },
  {
    title: 'Get Out',
    releaseYear: 2017,
    genres: ['Horror', 'Thriller'],
    director: 'Jordan Peele',
    actors: ['Daniel Kaluuya', 'Allison Williams'],
    description: 'A young man uncovers a disturbing secret when he visits his girlfriend’s family.',
  },
];

// Each review: [username, movie title, rating, text]. Parasite has none on purpose,
// so the sample data also shows a movie with 0 reviews.
const REVIEWS: [string, string, number, string][] = [
  ['dana', 'The Matrix', 9, 'Still amazing after all these years.'],
  ['yossi', 'The Matrix', 8, 'Great action, a bit confusing at first.'],
  ['noa', 'The Matrix', 10, 'A classic.'],
  ['avi', 'The Matrix', 7, 'The sequels ruined it a little for me.'],
  ['dana', 'Inception', 7, 'Clever, but too long.'],
  ['noa', 'Inception', 9, 'I want to watch it again.'],
  ['avi', 'Inception', 8, 'The ending is still being argued about at home.'],
  ['maya', 'Inception', 10, 'The music alone is worth it.'],
  ['yossi', 'The Godfather', 10, 'Perfect.'],
  ['dana', 'The Godfather', 9, 'Slow, but every scene matters.'],
  ['maya', 'The Godfather', 8, 'Brando is unforgettable.'],
  ['noa', 'Spirited Away', 8, 'Beautiful animation.'],
  ['maya', 'Spirited Away', 10, 'Pure magic.'],
  ['yossi', 'Spirited Away', 7, 'Strange in a good way.'],
  ['avi', 'Pulp Fiction', 9, 'The dialogue is brilliant.'],
  ['dana', 'Pulp Fiction', 6, 'Too violent for my taste.'],
  ['yossi', 'Pulp Fiction', 8, 'Loved the non-linear story.'],
  ['dana', 'The Dark Knight', 10, 'The best superhero movie ever made.'],
  ['yossi', 'The Dark Knight', 9, 'Heath Ledger steals every scene.'],
  ['noa', 'The Dark Knight', 9, 'Dark and gripping.'],
  ['avi', 'The Dark Knight', 10, 'Watched it five times.'],
  ['maya', 'The Dark Knight', 8, 'A little long, still great.'],
  ['noa', 'Forrest Gump', 9, 'Made me cry.'],
  ['avi', 'Forrest Gump', 8, 'Tom Hanks at his best.'],
  ['maya', 'Forrest Gump', 7, 'Sweet, if a bit sentimental.'],
  ['dana', 'The Lion King', 9, 'A childhood favorite.'],
  ['noa', 'The Lion King', 10, 'The songs are timeless.'],
  ['yossi', 'The Lion King', 8, 'Still holds up today.'],
  ['dana', 'Interstellar', 8, 'Ambitious and moving.'],
  ['yossi', 'Interstellar', 10, 'The docking scene is incredible.'],
  ['maya', 'Interstellar', 9, 'Science and emotion together.'],
  ['avi', 'Interstellar', 6, 'Too confusing in the last part.'],
  ['noa', 'Amélie', 9, 'Charming from start to finish.'],
  ['maya', 'Amélie', 8, 'Makes you want to visit Paris.'],
  ['avi', 'Get Out', 9, 'Scary and smart.'],
  ['noa', 'Get Out', 7, 'Good, but I guessed the twist.'],
];

// The seed wipes the database, so it must not run on production by accident.
// --force is the explicit "yes, I really mean it".
export const assertSeedAllowed = (nodeEnv: string | undefined, args: string[]): void => {
  if (nodeEnv === 'production' && !args.includes('--force')) {
    throw new Error(
      'Refusing to seed: NODE_ENV is "production" and the seed deletes all data. ' +
        'Run it with --force if you really mean it.',
    );
  }
};

export interface AdminCredentials {
  username: string;
  password: string;
}

// Expects an open Mongoose connection. Kept separate from main() so tests can
// run it against the in-memory database.
export const seed = async (admin: AdminCredentials): Promise<void> => {
  // Reset: start from empty collections, so running the seed twice gives the same result.
  await Promise.all([User.deleteMany({}), Movie.deleteMany({}), Review.deleteMany({})]);

  // User.create (not insertMany) so the pre('save') hook hashes each password.
  const adminUser = await User.create({ ...admin, role: 'admin' });
  const users = new Map<string, string>();
  for (const username of USERNAMES) {
    const user = await User.create({ username, password: DEMO_PASSWORD });
    users.set(username, user.id);
  }

  const movies = new Map<string, string>();
  for (const data of MOVIES) {
    const movie = await Movie.create({ ...data, createdBy: adminUser._id });
    movies.set(movie.title, movie.id);
  }

  // Through the review service, not Review.create, so every review also updates
  // the movie's reviewsCount, ratingsSum and averageRating, exactly like the API does.
  for (const [username, title, rating, text] of REVIEWS) {
    await createReview(movies.get(title)!, users.get(username)!, { rating, text });
  }
};

// Reads a variable the seed needs. Not in env.ts, because the server doesn't need it.
const requiredEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Add it to .env (see .env.example).`);
  }
  return value;
};

const main = async (): Promise<void> => {
  // Checked first, before connecting to anything.
  assertSeedAllowed(process.env.NODE_ENV, process.argv.slice(2));
  const admin = {
    username: requiredEnv('ADMIN_USERNAME'),
    password: requiredEnv('ADMIN_PASSWORD'),
  };

  await connectDB(env.mongodbUri);
  try {
    await seed(admin);
    console.log(
      `Seeded: admin "${admin.username.toLowerCase()}", users ${USERNAMES.join(', ')} ` +
        `(password "${DEMO_PASSWORD}"), ${MOVIES.length} movies, ${REVIEWS.length} reviews.`,
    );
  } finally {
    await mongoose.disconnect();
  }
};

// Runs main() only when this file is executed directly (npm run seed),
// not when a test imports it.
if (require.main === module) {
  main().catch((error: Error) => {
    console.error('Seed failed:', error.message);
    process.exit(1);
  });
}
