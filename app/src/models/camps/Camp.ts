import mongoose, { type Document, type Model, Schema, model } from 'mongoose'

/**
 * Camp — the authoritative registry record for one NYSC orientation camp.
 *
 * Referenced by info-hub, community, and camp-workspace. Only the platform
 * owner creates or modifies directory records in v1 (SPEC-camps.md);
 * status transitions and admin grants are audited.
 */
export type CampStatus = 'community' | 'claimed' | 'authorized'

export interface CampDoc extends Document {
  slug: string
  name: string
  state: string
  stateCode: string
  address: string
  city: string
  coordinates?: { lat: number; lng: number }
  travelInfo?: string
  verifiedSource?: string
  description?: string
  contactPhone?: string
  contactEmail?: string
  status: CampStatus
  claimedBy?: mongoose.Types.ObjectId
  authorizedBy?: mongoose.Types.ObjectId
  authorizedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const campSchema = new Schema<CampDoc>(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true, index: true },
    stateCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
    travelInfo: { type: String },
    // Provenance of the address/coordinates (source-driven-development:
    // every camp record cites where its data came from).
    verifiedSource: { type: String },
    description: { type: String },
    contactPhone: { type: String },
    contactEmail: { type: String, lowercase: true, trim: true },
    status: {
      type: String,
      enum: ['community', 'claimed', 'authorized'],
      default: 'community',
      required: true,
      index: true,
    },
    claimedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    authorizedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    authorizedAt: { type: Date },
  },
  { timestamps: true },
)

// Status badges on every camp surface use these exact strings (SPEC-camps.md).
export const CAMP_STATUS_LABELS: Record<CampStatus, string> = {
  community: 'Community-managed',
  claimed: 'Claimed by camp crew (unofficial)',
  authorized: 'Authorized by camp official',
}

export const Camp: Model<CampDoc> =
  mongoose.models.Camp ?? model<CampDoc>('Camp', campSchema)
