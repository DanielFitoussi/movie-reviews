# Design Decisions

Decisions about details the assignment left open on purpose.

## Permissions

| Action | Who can do it |
|---|---|
| View and search movies | Everyone, including guests |
| Create, update, delete a movie | Admin only |
| View reviews | Everyone, including guests |
| Write a review | Logged-in users only |
| Edit a review | Only the review's author |
| Delete a review | The review's author, or an admin |

## Users

- Each user has a `role`: `user` or `admin`.
- On registration the role is always `user`, even if the request sends something else.
- The first admin is created by the seed script, not through the API.
- Usernames are unique.

## Movies

- All fields are required: title, release year, genres, director, actors, description.
- `genres` and `actors` are arrays and must contain at least one item.
- `createdBy` stores the admin who created the movie, taken from the JWT, not from the request body.
- Search: partial, case-insensitive match on title. Can also filter by genre, year and director.
- Deleting a movie also deletes all its reviews (cascade delete, done in code).
- Each movie stores `reviewsCount` and `averageRating`. They are updated whenever a review is created, edited or deleted.

## Reviews

- Separate collection. Each review stores `movieId` and `userId`, and `userId` is taken from the JWT.
- `rating` is an integer from 1 to 10. `text` is required.
- One review per user per movie, using a unique index on `movieId` and `userId`. A duplicate returns 409.
- The average rating is rounded to one decimal place.

## General

- All models use `timestamps: true`, which adds `createdAt` and `updatedAt`.

## Status codes

- 400: invalid data.
- 401: not logged in.
- 403: logged in, but not allowed.
- 404: not found.
- 409: duplicate.