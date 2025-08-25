import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { supabase } from "./supabase/client"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          // Check if user exists in our custom users table
          const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('email', user.email)
            .single()

          if (!existingUser) {
            // Create user in our custom users table
            const { data: newUser, error } = await supabase
              .from('users')
              .insert({
                email: user.email!,
                name: user.name,
                google_id: profile?.sub, // Store Google ID
                password: null, // No password for OAuth users
              })
              .select()
              .single()

            if (error) {
              console.error('Error creating user:', error)
              return false
            }

            // Create a default business for the user
            await supabase
              .from('businesses')
              .insert({
                name: `${user.name}'s Business`,
                user_id: newUser.id,
              })
          }
        } catch (error) {
          console.error('Error in signIn callback:', error)
          return false
        }
      }
      return true
    },
    async jwt({ token, user, account }) {
      if (account?.provider === "google" && user) {
        try {
          // Get user from our custom table
          const { data: dbUser } = await supabase
            .from('users')
            .select(`
              *,
              businesses (*)
            `)
            .eq('email', user.email)
            .single()

          if (dbUser) {
            token.userId = dbUser.id
            token.business = dbUser.businesses?.[0] || null
          }
        } catch (error) {
          console.error('Error in jwt callback:', error)
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string
        session.user.business = token.business
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    signUp: '/register',
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.JWT_SECRET,
}
