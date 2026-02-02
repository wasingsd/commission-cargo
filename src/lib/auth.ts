import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { firestore } from "@/lib/firestore";
import { Role } from "@/lib/enums";

export const authOptions: NextAuthOptions = {
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/login",
    },
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            if (account?.provider === "google" && user.email) {
                // Check if user exists in Firestore
                let existingUser = await firestore.users.findByEmail(user.email);

                // If user doesn't exist, create them with default ADMIN role
                // (You can change this logic to restrict access)
                if (!existingUser) {
                    existingUser = await firestore.users.create({
                        email: user.email,
                        name: user.name || undefined,
                        role: Role.ADMIN,
                    });
                }

                return true;
            }
            return false;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as any;
            }
            return session;
        },
        async jwt({ token, user, account }) {
            if (account?.provider === "google" && user?.email) {
                // Fetch user from Firestore to get role
                const firestoreUser = await firestore.users.findByEmail(user.email);
                if (firestoreUser) {
                    token.id = firestoreUser.id;
                    token.role = firestoreUser.role;
                }
            }
            return token;
        },
    },
};
