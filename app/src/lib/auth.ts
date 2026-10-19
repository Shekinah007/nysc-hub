import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { z } from 'zod'
import { User } from '@/models/identity/User'
import { MongooseAdapter } from '@/lib/mongoose-adapter'

/**
 * Auth.js v5 configuration — credentials provider with database sessions.
 *
 * Database sessions (not JWT) are a spec requirement: deactivation or role
 * changes must kill live sessions on the next request. See
 * `getSessionAndUser` in the adapter — it drops sessions for deactivated
 * users.
 *
 * Unverified accounts cannot log in: authorize() rejects users with no
 * emailVerifiedAt. Passwords compared in constant time via bcrypt.
 */

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: MongooseAdapter(),
  session: { strategy: 'database' },
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      credentials: {
        email: { type: 'email', label: 'Email', placeholder: 'you@example.com' },
        password: { type: 'password', label: 'Password' },
      },
      async authorize(credentials) {
        const parsed = signInSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data
        const user = await User.findOne({ email: email.toLowerCase() }).lean()

        // Same failure either way: no account enumeration beyond the login
        // form's own error message.
        if (!user) return null
        if (user.deactivated) return null
        if (!user.emailVerifiedAt) return null

        const valid = await compare(password, user.passwordHash)
        if (!valid) return null

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          image: user.avatarUrl ?? null,
          emailVerified: user.emailVerifiedAt,
        }
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      // Expose only safe fields on the session object.
      if (session.user) {
        session.user.id = user.id
        session.user.emailVerified = user.emailVerified
      }
      return session
    },
  },
})
