import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { supabase } from "@/lib/supabase/client"

export const { auth, signIn, signOut, handlers } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  debug: true,
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET,
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.provider === "google" && profile?.sub) {
        (token as any).googleId = profile.sub
      }
      return token
    },
    async session({ session, token }) {
      const s: any = session || {}
      s.user = s.user || {}
      if ((token as any).googleId) s.user.googleId = (token as any).googleId
      return s
    },
    async redirect({ url, baseUrl }) {
      // After successful OAuth callback, go through bridge to set our custom cookie
      if (url.startsWith(baseUrl + "/api/auth/callback")) {
        return baseUrl + "/api/auth/bridge"
      }
      return url
    },
  },
  events: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return
      try {
        const email = user.email?.toLowerCase()
        if (!email) return
        const { data: existing } = await supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .single()
        if (!existing) {
          const { data: created } = await supabase
            .from('users')
            .insert({
              email,
              name: user.name,
              google_id: (profile as any)?.sub || null,
              password: null,
            })
            .select('id')
            .single()
          const userId = created?.id
          if (userId) {
            await supabase
              .from('businesses')
              .insert({ name: `${user.name}'s Business`, user_id: userId })
          }
        }
      } catch (err) {
        console.error("NextAuth signIn event error:", err)
      }
    },
  },
})
