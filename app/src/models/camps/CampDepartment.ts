import mongoose, { type Document, type Model, Schema, model } from 'mongoose'

/**
 * CampDepartment — one seeded department category within a camp.
 *
 * The default set (below) is seeded for every camp with `unofficial` status;
 * pages must be clearly labelled unofficial or community-managed until a
 * department is claimed/authorized (SPEC-camps.md).
 */
export type DepartmentStatus = 'unofficial' | 'claimed' | 'authorized'

export interface CampDepartmentDoc extends Document {
  campId: mongoose.Types.ObjectId
  key: string
  name: string
  description?: string
  status: DepartmentStatus
  claimedBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const campDepartmentSchema = new Schema<CampDepartmentDoc>(
  {
    campId: { type: Schema.Types.ObjectId, required: true, index: true },
    key: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String },
    status: {
      type: String,
      enum: ['unofficial', 'claimed', 'authorized'],
      default: 'unofficial',
      required: true,
    },
    claimedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

// A department key is unique within a camp.
campDepartmentSchema.index({ campId: 1, key: 1 }, { unique: true })

export const CampDepartment: Model<CampDepartmentDoc> =
  mongoose.models.CampDepartment ?? model<CampDepartmentDoc>('CampDepartment', campDepartmentSchema)

/**
 * The default department set seeded for every camp (SPEC-camps.md).
 * Keys are stable identifiers; names are the display labels.
 */
export const DEFAULT_DEPARTMENTS: ReadonlyArray<{ key: string; name: string }> = [
  { key: 'obs-media', name: 'OBS/Media' },
  { key: 'editorial-publicity', name: 'Editorial & Publicity' },
  { key: 'medical', name: 'Medical' },
  { key: 'sports-recreation', name: 'Sports & Recreation' },
  { key: 'man-o-war', name: "Man O' War" },
  { key: 'sanitation', name: 'Sanitation' },
  { key: 'religious-christian', name: 'Religious (Christian)' },
  { key: 'religious-muslim', name: 'Religious (Muslim)' },
  { key: 'drama-culture', name: 'Drama & Culture' },
  { key: 'socials-welfare', name: 'Socials & Welfare' },
]
