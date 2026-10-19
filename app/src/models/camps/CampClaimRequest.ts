import mongoose, { type Document, type Model, Schema, model } from 'mongoose'

/**
 * CampClaimRequest — a user's request to run a camp's workspace.
 *
 * Ownership is never granted automatically. Requests are manually reviewed
 * by the platform owner; approved requests grant a CampAdmin and flip the
 * camp to `claimed` (SPEC-camps.md). Requester contact is never exposed
 * publicly.
 */
export type ClaimRequestStatus = 'pending' | 'approved' | 'denied'

export interface CampClaimRequestDoc extends Document {
  campId: mongoose.Types.ObjectId
  requesterId: mongoose.Types.ObjectId
  message: string
  status: ClaimRequestStatus
  reviewedBy?: mongoose.Types.ObjectId
  reviewedAt?: Date
  reviewNote?: string
  createdAt: Date
  updatedAt: Date
}

const campClaimRequestSchema = new Schema<CampClaimRequestDoc>(
  {
    campId: { type: Schema.Types.ObjectId, required: true, index: true },
    requesterId: { type: Schema.Types.ObjectId, required: true, index: true },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'denied'],
      default: 'pending',
      required: true,
      index: true,
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewNote: { type: String },
  },
  { timestamps: true },
)

// One active request per (camp, requester) — re-requesting resets to pending.
campClaimRequestSchema.index({ campId: 1, requesterId: 1 }, { unique: true })

export const CampClaimRequest: Model<CampClaimRequestDoc> =
  mongoose.models.CampClaimRequest ?? model<CampClaimRequestDoc>('CampClaimRequest', campClaimRequestSchema)
