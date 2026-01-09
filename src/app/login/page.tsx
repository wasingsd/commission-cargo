'use client';
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
        });

        if (result?.ok) {
            router.push("/dashboard");
        } else {
            alert("Login failed");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-800">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md border border-slate-100">
                <div className="mb-6 text-center">
                    <div className="text-blue-600 font-bold text-xl mb-2">Commission Cargo</div>
                    <h1 className="text-2xl font-bold text-slate-900">Sign In</h1>
                    <p className="text-slate-500 text-sm">Welcome back to the system</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-700">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition"
                            placeholder="admin@example.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-700">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    <button className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium transition shadow-lg shadow-blue-600/20">
                        Sign In
                    </button>
                </form>

                <div className="mt-6 text-center text-xs text-slate-400">
                    Internal System for Authorized Personnel Only
                </div>
            </div>
        </div>
    );
}
