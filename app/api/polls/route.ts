import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findPostById, toStringId, toObjectId } from "@/lib/db";
import { getCollection } from "@/lib/mongodb";
import { COLLECTIONS } from "@/lib/db";
import { getSocketInstance } from "@/lib/socket-server";

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

// Vote on a poll (Standardized to handle both separate and embedded polls)
export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { pollId, optionId, postId } = await req.json();

        if (!pollId && !postId) {
            return NextResponse.json({ error: "Poll ID or Post ID required" }, { status: 400 });
        }

        const pollsCollection = await getCollection(COLLECTIONS.POLLS);
        const pollVotesCollection = await getCollection(COLLECTIONS.POLL_VOTES);
        const postsCollection = await getCollection(COLLECTIONS.POSTS);

        let finalPollId = pollId;
        let poll: any = null;

        if (pollId) {
            const pollIdObj = toObjectId(pollId);
            if (pollIdObj) {
                poll = await pollsCollection.findOne({ _id: pollIdObj });
            }
        } else if (postId) {
            const post = await findPostById(postId);
            if (post?.type === "poll" || post?.pollOptions) {
                poll = post;
                finalPollId = postId;
            }
        }

        if (!poll) {
            return NextResponse.json({ error: "Poll not found" }, { status: 404 });
        }

        // Check if already voted
        const existingVote = await pollVotesCollection.findOne({
            pollId: finalPollId,
            userId: session.user.id,
        });

        if (existingVote) {
            await pollVotesCollection.updateOne(
                { _id: existingVote._id },
                { $set: { optionId, updatedAt: new Date() } }
            );
        } else {
            await pollVotesCollection.insertOne({
                pollId: finalPollId,
                userId: session.user.id,
                optionId,
                createdAt: new Date(),
            });
        }

        // Get total vote counts
        const allVotes = await pollVotesCollection.find({ pollId: finalPollId }).toArray();
        const voteCounts = (poll.options || poll.pollOptions).map((_: any, idx: number) => {
            return allVotes.filter((v: any) => v.optionId === idx).length;
        });

        const totalVotes = allVotes.length;

        // Sync with posts collection if it's an embedded poll
        if (postId || (poll.postId && !pollId)) {
            const targetPostId = postId || poll.postId;
            const targetPostIdObj = toObjectId(targetPostId);
            if (targetPostIdObj) {
                // Better: update specific indices
                for (let i = 0; i < voteCounts.length; i++) {
                    await postsCollection.updateOne(
                        { _id: targetPostIdObj },
                        { $set: { [`pollOptions.${i}.votes`]: voteCounts[i] } }
                    );
                }
            }
        }

        const responseData = {
            pollId: finalPollId,
            optionId,
            voteCounts,
            totalVotes,
        };

        // Broadcast real-time update
        try {
            const io = getSocketInstance();
            if (io) {
                const broadcastRoom = postId ? `post:${postId}` : `poll:${finalPollId}`;
                io.to(broadcastRoom).emit("poll_update", responseData);
                // Also broadcast globally if needed or to general feed
                io.emit("poll_refreshed", { postId, ...responseData });
            }
        } catch (err) {
            console.warn("Socket broadcast failed for poll update");
        }

        return NextResponse.json(responseData);
    } catch (error: any) {
        console.error("Error voting on poll:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

// Keep PUT for compatibility
export async function PUT(req: Request) {
    return PATCH(req);
}
