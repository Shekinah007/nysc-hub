import mongoose, { type Document, type Model, Schema, model } from 'mongoose'

/**
 * Account — links an identity provider to a User.
 *
 * For v1 the only provider is our own credentials login, stored with
 * provider 'credentials' and providerAccountId = the user's email. Kept
 * because Auth.js' adapter contract expects `getUserByAccount`, and because
 * later providers (Task: ask-first) land here without touching User.
 */
export interface AccountDoc extends Document {
  userId: mongoose.Types.ObjectId
  provider: string
  providerAccountId: string
  type: string
  createdAt: Date
  updatedAt: Date
}

const accountSchema = new Schema<AccountDoc>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    provider: { type: String, required: true },
    providerAccountId: { type: String, required: true },
    type: { type: String, required: true, default: 'credentials' },
  },
  { timestamps: true },
)

// A provider account is unique per user.
accountSchema.index({ provider: 1, providerAccountId: 1 }, { unique: true })

export const Account: Model<AccountDoc> =
  mongoose.models.Account ?? model<AccountDoc>('Account', accountSchema)
