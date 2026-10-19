import mongoose, { type Document, type Model, Schema, model } from 'mongoose'

/**
 * CampAdmin — an active administrative grant over a camp or a department.
 *
 * One active grant per (camp, user, scope, department). Grants are revocable;
 * `revokedAt` being set means the grant is historical, not active. Every
 * grant and revocation writes an AuditEntry (SPEC-camps.md).
 */
export type CampAdminScope = 'camp' | 'department'

export interface CampAdminDoc extends Document {
  campId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  scope: CampAdminScope
  departmentId?: mongoose.Types.ObjectId
  grantedBy: mongoose.Types.ObjectId
  grantedAt: Date
  revokedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const campAdminSchema = new Schema<CampAdminDoc>(
  {
    campId: { type: Schema.Types.ObjectId, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    scope: { type: String, enum: ['camp', 'department'], required: true },
    departmentId: { type: Schema.Types.ObjectId },
    grantedBy: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    grantedAt: { type: Date, required: true, default: Date.now },
    revokedAt: { type: Date },
  },
  { timestamps: true },
)

// One ACTIVE grant per (camp, user, scope, department) — partial filter
// excludes revoked grants so a revoked admin can be re-granted cleanly.
campAdminSchema.index(
  { campId: 1, userId: 1, scope: 1, departmentId: 1 },
  { unique: true, partialFilterExpression: { revokedAt: null } },
)

export const CampAdmin: Model<CampAdminDoc> =
  mongoose.models.CampAdmin ?? model<CampAdminDoc>('CampAdmin', campAdminSchema)
