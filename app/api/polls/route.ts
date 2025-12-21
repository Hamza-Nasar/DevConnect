import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findPostById, toStringId, toObjectId } from "@/lib/db";
import { getCollection } from "@/lib/mongodb";
import { COLLECTIONS } from "@/lib/db";

// Create a poll
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { postId, question, options, expiresAt } = await req.json();

        if (!postId || !question || !options || options.length < 2) {
            return NextResponse.json(
                { error: "Post ID, question, and at least 2 options required" },
                { status: 400 }
            );
        }

        const post = await findPostById(postId);
        if (!post) {
            return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }

        const pollsCollection = await getCollection(COLLECTIONS.POLLS);
        const result = await pollsCollection.insertOne({
            postId,
            question: question.trim(),
            options,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            createdAt: new Date(),
        });

        const poll = await pollsCollection.findOne({ _id: result.insertedId });

        return NextResponse.json({
            id: toStringId(poll?._id),
            postId: poll?.postId,
            question: poll?.question,
            options: poll?.options || [],
            expiresAt: poll?.expiresAt || null,
            createdAt: poll?.createdAt,
        }, { status: 201 });
    } catch (error: any) {
        console.error("Error creating poll:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

// Vote on a poll
export async function PUT(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { pollId, optionId } = await req.json();

        if (!pollId || optionId === undefined) {
            return NextResponse.json({ error: "Poll ID and option ID required" }, { status: 400 });
        }

        const pollsCollection = await getCollection(COLLECTIONS.POLLS);
        const pollVotesCollection = await getCollection(COLLECTIONS.POLL_VOTES);

        const pollIdObj = toObjectId(pollId);
        if (!pollIdObj) {
            return NextResponse.json({ error: "Invalid poll ID" }, { status: 400 });
        }
        const poll = await pollsCollection.findOne({ _id: pollIdObj });
        if (!poll) {
            return NextResponse.json({ error: "Poll not found" }, { status: 404 });
        }

        // Check if already voted
        const existingVote = await pollVotesCollection.findOne({
            pollId,
            userId: session.user.id,
        });

        if (existingVote) {
            // Update existing vote
            await pollVotesCollection.updateOne(
                { _id: existingVote._id },
                { $set: { optionId } }
            );
        } else {
            // Create new vote
            await pollVotesCollection.insertOne({
                pollId,
                userId: session.user.id,
                optionId,
            });
        }

        // Get vote counts
        const votes = await pollVotesCollection.find({ pollId }).toArray();
        const voteCounts = poll.options.map((_: any, idx: number) => {
            return votes.filter((v: any) => v.optionId === idx).length;
        });

        return NextResponse.json({
            pollId,
            optionId,
            voteCounts,
            totalVotes: votes.length,
        });
    } catch (error: any) {
        console.error("Error voting on poll:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
