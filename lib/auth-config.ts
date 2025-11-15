import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { supabase } from "./supabase/client"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/gmail.readonly",
          ].join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          // Check if user exists
          const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('email', user.email)
            .single()

          if (!existingUser) {
            const { data: newUser, error } = await supabase
              .from('users')
              .insert({
                email: user.email!,
                name: user.name,
                google_id: profile?.sub,
                password: null,
              })
              .select()
              .single()

            if (error) return false

            await supabase
              .from('businesses')
              .insert({ name: `${user.name}'s Business`, user_id: newUser.id })
          }
        } catch (err) {
          console.error(err)
          return false
        }
      }
      return true
    },
    async jwt({ token, user, account }) {
      // Store Google tokens
      if (account?.provider === "google") {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
      }

      // Add custom Supabase user info
      if (user) {
        const { data: dbUser } = await supabase
          .from('users')
          .select(`*, businesses (*)`)
          .eq('email', user.email)
          .single()

        if (dbUser) {
          token.userId = dbUser.id
          token.business = dbUser.businesses?.[0] || null
        }
      }

      return token
    },
    async session({ session, token }) {
      session.user.id = token.userId as string
      session.user.business = token.business
      session.accessToken = token.accessToken
      session.refreshToken = token.refreshToken
      return session
    },
  },
  pages: { signIn: "/login", signUp: "/register" },
  session: { strategy: "jwt" },
  secret: process.env.JWT_SECRET,
}