import type { Adapter, AdapterSession, AdapterUser } from '@auth/core/adapters'
import { Account } from '@/models/identity/Account'
import { Session, type SessionDoc } from '@/models/identity/Session'
import { User, type UserDoc } from '@/models/identity/User'

/**
 * A thin custom Auth.js adapter over our own Mongoose models.
 *
 * Why custom instead of @auth/mongodb-adapter: that package speaks the raw
 * Mongo driver and would maintain its own parallel users/sessions collections,
 * duplicating the identity models we already built and tested. The spec
 * (SPEC-identity.md tech stack) explicitly allows "a thin custom adapter over
 * Mongoose models". One client, our User schema is the source of truth, and
 * session lookups can enforce `deactivated` directly (see getSessionAndUser).
 *
 * Method set per https://authjs.dev/guides/adapters/creating-a-database-adapter
 * (verified 2026-10-19 against @auth/core 0.41.3).
 */

function toAdapterUser(u: UserDoc): AdapterUser {
  return {
    id: u._id.toString(),
    email: u.email,
    name: u.name,
    image: u.avatarUrl ?? null,
    emailVerified: u.emailVerifiedAt ?? null,
  }
}

function toAdapterSession(s: SessionDoc): AdapterSession {
  return {
    sessionToken: s.sessionToken,
    userId: s.userId.toString(),
    expires: s.expires,
  }
}

export function MongooseAdapter(): Adapter {
  return {
    async createUser() {
      // Credentials login never creates users — registration lives in the
      // identity server actions. Throwing surfaces any misuse loudly.
      throw new Error(
        'MongooseAdapter.createUser: registration is handled by /api/auth register actions',
      )
    },

    async getUser(id) {
      const u = await User.findById(id).lean<UserDoc>()
      return u ? toAdapterUser(u) : null
    },

    async getUserByEmail(email) {
      const u = await User.findOne({ email: email.toLowerCase() }).lean<UserDoc>()
      return u ? toAdapterUser(u) : null
    },

    async getUserByAccount({ provider, providerAccountId }) {
      const account = await Account.findOne({ provider, providerAccountId }).lean()
      if (!account) return null
      const u = await User.findById(account.userId).lean<UserDoc>()
      return u ? toAdapterUser(u) : null
    },

    async updateUser(user) {
      const u = await User.findByIdAndUpdate(user.id, user, { new: true }).lean<UserDoc>()
      if (!u) throw new Error(`updateUser: no user for id ${user.id}`)
      return toAdapterUser(u)
    },

    async deleteUser(userId) {
      await User.deleteOne({ _id: userId })
    },

    async linkAccount(account) {
      await Account.create({
        userId: account.userId,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        type: account.type,
      })
    },

    async unlinkAccount({ provider, providerAccountId }) {
      await Account.deleteOne({ provider, providerAccountId })
    },

    async createSession(session) {
      const s = await Session.create({
        sessionToken: session.sessionToken,
        userId: session.userId,
        expires: session.expires,
      })
      return toAdapterSession(s)
    },

    async getSessionAndUser(sessionToken) {
      const s = await Session.findOne({ sessionToken }).lean<SessionDoc>()
      if (!s) return null
      const u = await User.findById(s.userId).lean<UserDoc>()
      if (!u) return null
      // Deactivated accounts must not hold sessions even with a valid token.
      if (u.deactivated) {
        await Session.deleteOne({ sessionToken })
        return null
      }
      return { session: toAdapterSession(s), user: toAdapterUser(u) }
    },

    async updateSession(session) {
      const s = await Session.findOneAndUpdate(
        { sessionToken: session.sessionToken },
        { expires: session.expires },
        { new: true },
      ).lean<SessionDoc>()
      return s ? toAdapterSession(s) : null
    },

    async deleteSession(sessionToken) {
      await Session.deleteOne({ sessionToken })
    },
  }
}
