import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { firestore } from "@/lib/firestore";
import { Role } from "@/lib/enums";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/login",
    },
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("กรุณากรอกอีเมลและรหัสผ่าน");
                }

                try {
                    const user = await firestore.users.findByEmail(credentials.email);

                    if (!user || !user.password) {
                        console.error("Auth Error: User not found or no password for", credentials.email);
                        throw new Error("ไม่พบผู้ใช้งานหรือบัญชียังไม่ได้ตั้งรหัสผ่าน");
                    }

                    const isPasswordCorrect = await bcrypt.compare(
                        credentials.password,
                        user.password
                    );

                    if (!isPasswordCorrect) {
                        console.error("Auth Error: Invalid password for", credentials.email);
                        throw new Error("รหัสผ่านไม่ถูกต้อง");
                    }

                    return {
                        id: user.id as string,
                        email: user.email as string,
                        name: user.name as string,
                        role: user.role as Role,
                    };
                } catch (error) {
                    console.error("Critical Auth Error:", error);
                    throw error;
                }
            }
        }),
    ],
    secret: process.env.NEXTAUTH_SECRET || "dev_secret_key_12345",
    callbacks: {
        async signIn({ account }) {
            if (account?.provider === "credentials") {
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
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user as any).role;
            } else if (token.email && !token.role) {
                // Background refresh for role if needed
                const firestoreUser = await firestore.users.findByEmail(token.email);
                if (firestoreUser) {
                    token.id = firestoreUser.id;
                    token.role = firestoreUser.role;
                }
            }
            return token;
        },
    },
};
