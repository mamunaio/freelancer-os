import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";

/**
 * `NumberSequence` — atomic counter for gap-free invoice numbers.
 *
 * One row per `(organizationId, scope)`. Allocator code uses
 * `findOneAndUpdate` with `$inc: { next: 1 }` and `upsert: true` so
 * concurrent invoice creations serialise on the document and never
 * collide. The returned `next` is the freshly allocated sequence value.
 *
 * Scopes are open-ended for future use (proposals etc.). v1 only writes
 * `"invoice"`.
 */

const numberSequenceSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    scope: { type: String, required: true }, // "invoice"
    prefix: { type: String, required: true, default: "INV-" },
    next: { type: Number, required: true, default: 1 },
  },
  { timestamps: true, collection: "number_sequences" },
);

numberSequenceSchema.index(
  { organizationId: 1, scope: 1 },
  { unique: true },
);

export type NumberSequenceDoc = InferSchemaType<typeof numberSequenceSchema> & {
  _id: Types.ObjectId;
};

export const NumberSequence =
  models.NumberSequence ?? model("NumberSequence", numberSequenceSchema);
