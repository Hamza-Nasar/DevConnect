import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { COLLECTIONS } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membersCollection = await getCollection(COLLECTIONS.GROUP_MEMBERS);
    const groupsCollection = await getCollection("groups");

    const memberships = await membersCollection
      .find({ userId: session.user.id })
      .toArray();

    const groups = await Promise.all(
      memberships.map(async (membership) => {
        const group = await groupsCollection.findOne({
          _id: membership.groupId,
        });
        return {
          ...group,
          role: membership.role,
        };
      })
    );

    return NextResponse.json({ groups });
  } catch (error: any) {
    console.error("Error fetching my groups:", error);
    return NextResponse.json(
      { error: "Failed to fetch groups" },
      { status: 500 }
    );
  }
}







