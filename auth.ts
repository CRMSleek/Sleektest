import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { supabase } from "@/lib/supabase/client"

// Helper for refreshing Google access tokens
async function refreshAccessToken(token: any) {
  try {
    const url = "https://oauth2.googleapis.com/token"
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
    })

    const refreshedTokens = await res.json()
    if (!res.ok) throw refreshedTokens

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    }
  } catch (err) {
    console.error("Error refreshing access token", err)
    return { ...token, error: "RefreshAccessTokenError" }
  }
}

export const { auth, signIn, signOut, handlers } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            // include readonly so server can list/read messages
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/userinfo.email",
          ].join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  debug: true,
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET,
  callbacks: {
    async jwt({ token, account, profile }) {
      // On initial sign in
      if (account && account.provider === "google") {
        token.googleId = profile?.sub
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.accessTokenExpires = account.expires_at
          ? account.expires_at * 1000
          : null
      }

      // Refresh token if expired
      if (token.accessTokenExpires && Date.now() > token.accessTokenExpires) {
        return await refreshAccessToken(token)
      }

      return token
    },
    async session({ session, token }) {
      session.user = session.user || {}
      session.user.googleId = token.googleId
      session.accessToken = token.accessToken
      session.refreshToken = token.refreshToken
      return session
    },
    async redirect({ url, baseUrl }) {
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
          .from("users")
          .select("id")
          .eq("email", email)
          .single()
        if (!existing) {
          const { data: created } = await supabase
            .from("users")
            .insert({
              email,
              name: user.name,
              google_id: (profile as any)?.sub || null,
              password: null,
            })
            .select("id")
            .single()
          const userId = created?.id
          if (userId) {
            await supabase
              .from("businesses")
              .insert({ name: `${user.name}'s Business`, user_id: userId })
          }
        }
      } catch (err) {
        console.error("NextAuth signIn event error:", err)
      }
    },
  },
})