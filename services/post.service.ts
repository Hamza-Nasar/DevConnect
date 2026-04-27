import type { Document, WithId } from "mongodb";
import { rankPosts } from "../lib/ai/feedRanking";
import {
  COLLECTIONS,
  createPost,
  findFollowsByFollowerId,
  findPosts,
  toObjectId,
  toStringId,
} from "../lib/db";
import { getCollection } from "../lib/mongodb";
import { findUserByEmailAddress, publicUser } from "./user.service";

export interface CreatePostInput {
  title?: string;
  content: string;
  images?: string[];
  video?: string;
  hashtags?: string[];
  location?: string;
  isPublic?: boolean;
  groupId?: string;
  linkPreview?: {
    url: string;
    title: string;
    description?: string;
    image?: string;
  };
  postType?: "tip" | "bug" | "library" | "announcement" | "regular";
  codeSnippet?: {
    code: string;
    language: string;
  };
  language?: string;
  framework?: string;
  saveToKnowledgeBase?: boolean;
}

export async function createPostForUserEmail(email: string, input: CreatePostInput) {
  if (!input.content?.trim() && !input.images?.length && !input.video) {
    throw Object.assign(new Error("Content, images, or video required"), { statusCode: 400 });
  }

  const user = await findUserByEmailAddress(email);
  if (!user) {
    throw Object.assign(new Error("User not found"), { statusCode: 404 });
  }

  const extractedHashtags = input.hashtags || [];
  const contentHashtags = input.content.match(/#\w+/g) || [];
  const allHashtags = [
    ...new Set([...extractedHashtags, ...contentHashtags.map((tag) => tag.replace("#", ""))]),
  ];

  const post = await createPost({
    title: input.title?.trim() || null,
    content: input.content?.trim() || "",
    userId: toStringId(user._id),
    images: input.images || [],
    video: input.video || null,
    hashtags: allHashtags,
    location: input.location || null,
    linkPreview: input.linkPreview || null,
    isPublic: input.isPublic !== false,
    groupId: input.groupId || null,
    postType: input.postType || "regular",
    codeSnippet: input.codeSnippet || null,
    language: input.language || null,
    framework: input.framework || null,
    savedToKnowledgeBase: input.saveToKnowledgeBase || false,
  });

  const usersCollection = await getCollection(COLLECTIONS.USERS);
  await usersCollection.updateOne({ _id: user._id }, { $inc: { postsCount: 1 } });

  return {
    post,
    user,
    response: formatPost(post, user, { likedByUser: false, likesCount: 0 }),
  };
}

export async function getFeedPosts(userId: string | undefined, page: number, limit: number) {
  const skip = (page - 1) * limit;
  const posts = (await findPosts(limit, skip)) as WithId<Document>[];

  if (!posts?.length) return [];

  const commentsCollection = await getCollection(COLLECTIONS.COMMENTS);
  const likesCollection = await getCollection(COLLECTIONS.LIKES);
  const usersCollection = await getCollection(COLLECTIONS.USERS);

  const formattedPosts = await Promise.all(
    posts.map(async (post) => {
      const postId = toStringId(post._id);
      const postUserId = post.userId;
      const userIdObj = toObjectId(postUserId);
      const user = userIdObj ? await usersCollection.findOne({ _id: userIdObj }) : null;

      const [comments, liked, likesCount] = await Promise.all([
        commentsCollection.find({ postId }).toArray(),
        userId
          ? likesCollection.findOne({
              userId: userId.toString(),
              postId,
            })
          : null,
        likesCollection.countDocuments({ postId }),
      ]);

      return formatPost(post, user, {
        likedByUser: !!liked,
        commentsCount: post.commentsCount || comments.length,
        likesCount: post.likesCount || likesCount,
      });
    })
  );

  if (!userId) return formattedPosts;

  try {
    const follows = await findFollowsByFollowerId(userId);
    const followedUsers = follows.map((follow) => follow.followingId);
    const userObjectId = toObjectId(userId);
    const userDoc = userObjectId ? await usersCollection.findOne({ _id: userObjectId }) : null;

    const rankedMetrics = rankPosts(
      formattedPosts
        .filter((post) => post.id && post.user.id)
        .map((post) => ({
          id: post.id as string,
          type: "regular",
          likesCount: post.likesCount || 0,
          commentsCount: post.commentsCount || 0,
          sharesCount: post.sharesCount || 0,
          viewsCount: post.viewsCount || 0,
          createdAt: new Date(post.createdAt),
          userId: post.user.id as string,
          hashtags: post.hashtags || [],
          hasCode: !!post.codeSnippet,
          content: post.content || "",
        })),
      {
        followedUsers,
        likedHashtags: userDoc?.interests || [],
        interactedUsers: [],
        mood: userDoc?.currentMood || null,
      }
    );

    const rankedIds = rankedMetrics.map((post) => post.id);
    return [...formattedPosts].sort((a, b) => {
      const aIndex = a.id ? rankedIds.indexOf(a.id) : -1;
      const bIndex = b.id ? rankedIds.indexOf(b.id) : -1;
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return 0;
    });
  } catch (error) {
    console.warn("Feed ranking failed, falling back to chronological:", error);
    return formattedPosts;
  }
}

export async function getFollowerIdsForUser(userId: string) {
  const followsCollection = await getCollection(COLLECTIONS.FOLLOWS);
  const followers = await followsCollection.find({ followingId: userId }).toArray();
  return followers.map((follow) => follow.followerId as string);
}

function formatPost(post: any, user: any, overrides: Record<string, unknown> = {}) {
  return {
    id: toStringId(post?._id),
    title: post?.title || null,
    content: post?.content || "",
    images: post?.images || [],
    video: post?.video || null,
    hashtags: post?.hashtags || [],
    location: post?.location || null,
    createdAt: post?.createdAt,
    updatedAt: post?.updatedAt || post?.createdAt,
    user: publicUser(user) || {
      id: toStringId(post?.userId),
      name: null,
      avatar: null,
      image: null,
      username: null,
      verified: false,
    },
    commentsCount: post?.commentsCount || 0,
    likesCount: post?.likesCount || 0,
    sharesCount: post?.sharesCount || 0,
    viewsCount: post?.viewsCount || 0,
    likedByUser: false,
    sharedByUser: false,
    isPublic: post?.isPublic !== false,
    codeSnippet: post?.codeSnippet || null,
    ...overrides,
  };
}
