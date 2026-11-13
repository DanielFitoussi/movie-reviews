import bcrypt from 'bcryptjs';
import { Schema, model } from 'mongoose';

export const ROLES = ['user', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export interface IUser {
  username: string;
  password: string;
  role: Role;
}

export const MIN_PASSWORD_LENGTH = 8;

// How much work bcrypt does per hash. Higher is slower to crack, but also slower to log in. 10 is the usual default.
const SALT_ROUNDS = 10;

const userSchema = new Schema<IUser>(
  {
    // lowercase makes usernames case-insensitive: "Dana" and "dana" are stored the same way.
    username: { type: String, required: true, trim: true, lowercase: true, unique: true },
    // select: false means queries don't return the password unless they ask for it
    // with .select('+password'). Only login needs it.
    password: { type: String, required: true, minlength: MIN_PASSWORD_LENGTH, select: false },
    role: { type: String, enum: ROLES, default: 'user' },
  },
  {
    timestamps: true,
    toJSON: {
      // A second safety net: even if a password was loaded, it's removed before sending.
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.password;
        return ret;
      },
    },
  },
);

// Runs before every save, after validation (so minlength checks the plain password).
// Hashing here, not in the service, means every way of creating a user
// (the API, tests, a seed script) stores a hash and never the plain text.
userSchema.pre('save', async function () {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
  }
});

export const User = model<IUser>('User', userSchema);
