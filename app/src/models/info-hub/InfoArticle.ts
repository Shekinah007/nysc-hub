import mongoose, { type Document, type Model, Schema, model } from 'mongoose'

/**
 * InfoArticle — the info-hub content layer (SPEC-info-hub.md).
 *
 * Prospective corpers arrive via Google for this: documents, fees, travel,
 * relocation. Accuracy is the trust motor of the module — every factual
 * claim carries a citation in `sources`, and `reviewedAt` is the "last
 * reviewed" date the spec requires on every published article.
 *
 * Status lifecycle: draft → published → archived. Only `published` is
 * visible on public routes; drafts never leak.
 */
export type ArticleCategory = 'documents' | 'fees' | 'travel' | 'relocation' | 'general'
export type ArticleStatus = 'draft' | 'published' | 'archived'

export const ARTICLE_CATEGORIES: ArticleCategory[] = [
  'documents',
  'fees',
  'travel',
  'relocation',
  'general',
]

export interface ArticleSource {
  title: string
  url: string
  /** When the source was last checked — citations go stale. */
  checkedAt?: Date
}

export interface InfoArticleDoc extends Document {
  slug: string
  title: string
  category: ArticleCategory
  body: string
  tags: string[]
  campIds: mongoose.Types.ObjectId[]
  sources: ArticleSource[]
  status: ArticleStatus
  publishedAt?: Date
  reviewedAt?: Date
  updatedBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const articleSourceSchema = new Schema<ArticleSource>(
  {
    title: { type: String, required: true },
    url: { type: String, required: true },
    checkedAt: { type: Date },
  },
  { _id: false },
)

const infoArticleSchema = new Schema<InfoArticleDoc>(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    category: {
      type: String,
      enum: ARTICLE_CATEGORIES,
      required: true,
      index: true,
    },
    body: { type: String, required: true },
    tags: [{ type: String }],
    campIds: [{ type: Schema.Types.ObjectId, ref: 'Camp' }],
    sources: [articleSourceSchema],
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      required: true,
      index: true,
    },
    publishedAt: { type: Date },
    reviewedAt: { type: Date },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

// Site-wide search (SPEC-info-hub.md): text index over title + body + tags.
infoArticleSchema.index({
  title: 'text',
  body: 'text',
  tags: 'text',
})

export const InfoArticle: Model<InfoArticleDoc> =
  mongoose.models.InfoArticle ?? model<InfoArticleDoc>('InfoArticle', infoArticleSchema)
