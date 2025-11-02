import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        // Redirect to NextAuth sign-in page instead of "/" to avoid loop
        redirect("/api/auth/signin");
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p>Welcome {session.user?.name}</p>
            <p>Email: {session.user?.email}</p>
        </div>
    );
}
