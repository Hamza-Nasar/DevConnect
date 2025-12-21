import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);

    if (!session) redirect("/login");

    return <DashboardClient user={session.user} />;
}
