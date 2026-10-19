import mongoose, { type Document, type Model, Schema, model } from 'mongoose'

/**
 * AuditEntry — the shared, append-only audit log. Written by `identity`
 * (user role/deactivation changes), `camps` (status transitions, admin
 * grants), and `camp-workspace` (all admin actions).
 *
 * Design rule from SPEC-identity.md: mutations that change platformAdmin or
 * deactivated status must write an AuditEntry in the same operation.
 */
export type AuditAction =
  | 'user.register'
  | 'user.verify-email'
  | 'user.password-reset'
  | 'user.deactivate'
  | 'user.reactivate'
  | 'user.grant-platform-admin'
  | 'user.revoke-platform-admin'
  | 'camp.status-change'
  | 'camp.admin-grant'
  | 'camp.admin-revoke'
  | 'camp.claim-request'
  | 'camp.claim-approve'
  | 'camp.claim-deny'
  | 'workspace.publish'
  | 'workspace.update'
  | 'workspace.delete'
  | 'workspace.moderate'

export interface AuditEntryDoc extends Document {
  actorId: mongoose.Types.ObjectId | null
  action: AuditAction
  targetType: string
  targetId: mongoose.Types.ObjectId
  metadata?: Record<string, unknown>
  createdAt: Date
}

const auditEntrySchema = new Schema<AuditEntryDoc>(
  {
    actorId: { type: Schema.Types.ObjectId, default: null, index: true },
    action: { type: String, required: true, index: true },
    targetType: { type: String, required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
)

// The common query: "everything that happened to this target, newest first."
auditEntrySchema.index({ targetType: 1, targetId: 1, createdAt: -1 })

export const AuditEntry: Model<AuditEntryDoc> =
  mongoose.models.AuditEntry ?? model<AuditEntryDoc>('AuditEntry', auditEntrySchema)
