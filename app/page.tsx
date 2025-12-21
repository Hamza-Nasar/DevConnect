import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  let session = null;

  try {
    session = await getServerSession(authOptions);
  } catch (error: any) {
    // Only log actual errors, not redirect signals (though getServerSession shouldn't redirect usually)
    console.error("❌ Error checking session:", error?.message || error);
  }

  if (session) {
    redirect("/feed");
  } else {
    redirect("/login");
  }
}
