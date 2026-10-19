import mongoose, { type Document, type Model, Schema, model } from 'mongoose'

/**
 * User — the account record. Deliberately minimal on identity:
 *
 * PERMANENT v1 CONSTRAINT (SPEC-identity.md, SPEC-verification.md): no NYSC
 * identity data whatsoever — no state codes, call-up numbers, call-up
 * letters, or ID documents. Community trust lives in the `verification`
 * module, separate from this record. There is a schema-shape test in
 * tests/identity/models.test.ts guarding this — never add such a field.
 */
export type LifecycleStage = 'prospective' | 'serving' | 'finished'

export interface UserDoc extends Document {
  email: string
  passwordHash: string
  name: string
  avatarUrl?: string
  lifecycleStage: LifecycleStage
  platformAdmin: boolean
  deactivated: boolean
  emailVerifiedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const userSchema = new Schema<UserDoc>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    avatarUrl: { type: String },
    lifecycleStage: {
      type: String,
      enum: ['prospective', 'serving', 'finished'],
      default: 'prospective',
    },
    platformAdmin: { type: Boolean, default: false },
    deactivated: { type: Boolean, default: false },
    emailVerifiedAt: { type: Date },
  },
  { timestamps: true },
)

// Deactivated accounts must not be able to log in even with a valid password.
userSchema.virtual('isActive').get(function (this: UserDoc) {
  return !this.deactivated
})

export const User: Model<UserDoc> =
  mongoose.models.User ?? model<UserDoc>('User', userSchema)
