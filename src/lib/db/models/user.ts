import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";

/**
 * `User` — global identity, not org-scoped.
 *
 * A single User can be a member of many Organizations via `OrgMember`.
 * Auth.js writes the `email`, `name`, `image`, `emailVerified` fields itself
 * via the MongoDB adapter on the `users` collection — we extend the same
 * collection with our own preference fields.
 */

const authProviderSchema = new Schema(
  {
    provider: { type: String, required: true }, // "google" | "credentials" | …
    providerAccountId: { type: String, required: true },
  },
  { _id: false },
);

const dashboardLayoutSchema = new Schema(
  {
    sections: {
      // Order + visibility per dashboard section.
      type: [
        {
          id: { type: String, required: true },
          visible: { type: Boolean, default: true },
        },
      ],
      default: [],
      _id: false,
    },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, default: null },
    image: { type: String, default: null },
    emailVerified: { type: Date, default: null },
    passwordHash: { type: String, default: null, select: false },

    // Preferences
    locale: { type: String, enum: ["en", "bn"], default: "en" },
    themeMode: { type: String, enum: ["dark", "light"], default: "dark" },
    activeOrgId: { type: Schema.Types.ObjectId, ref: "Organization", default: null },
    dashboardLayout: { type: dashboardLayoutSchema, default: () => ({}) },

    // Linked OAuth accounts (informational mirror of Auth.js `accounts` collection)
    authProviders: { type: [authProviderSchema], default: [] },
  },
  {
    timestamps: true,
    // Use the same collection name Auth.js adapter expects.
    collection: "users",
  },
);

userSchema.index({ email: 1 }, { unique: true });

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: Types.ObjectId };
export type UserId = Types.ObjectId;

export const User = models.User ?? model("User", userSchema);
