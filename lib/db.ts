// MongoDB database helper functions
export { getCollection, getDb } from "./mongodb";
import { getCollection, getDb } from "./mongodb";
import { ObjectId } from "mongodb";

// Collection names
export const COLLECTIONS = {
  USERS: "users",
  POSTS: "posts",
  COMMENTS: "comments",
  LIKES: "likedposts",
  SHARES: "sharedposts",
  FOLLOWS: "follows",
  NOTIFICATIONS: "notifications",
  ACCOUNTS: "accounts",
  SESSIONS: "sessions",
  STORIES: "stories",
  POLLS: "polls",
  POLL_VOTES: "pollvotes",
  MESSAGES: "messages",
  GROUPS: "groups",
  GROUP_MEMBERS: "groupmembers",
  GROUP_POSTS: "groupposts",
  USER_SETTINGS: "usersettings",
  PROFILE_VIEWS: "profileviews",
} as const;

// Helper to convert string ID to ObjectId
export function toObjectId(id: string | undefined | null): ObjectId | null {
  if (!id) return null;
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

// Helper to convert ObjectId to string
export function toStringId(id: ObjectId | string | undefined | null): string | null {
  if (!id) return null;
  if (typeof id === "string") return id;
  return id.toString();
}

// User helpers
export async function findUserByEmail(email: string) {
  const collection = await getCollection(COLLECTIONS.USERS);
  return collection.findOne({ email });
}

export async function findUserById(id: string) {
  const collection = await getCollection(COLLECTIONS.USERS);
  const _id = toObjectId(id);
  if (_id) {
    const user = await collection.findOne({ _id });
    if (user) return user;
  }

  // Fallback: try to find by string 'id' field (common for OAuth users if schema varies)
  return collection.findOne({ id: id });
}

export async function findUserByUsername(username: string) {
  const collection = await getCollection(COLLECTIONS.USERS);

  // First try exact username match
  let user = await collection.findOne({ username });
  if (user) return user;

  // Check if it works as an ID
  try {
    if (username.length === 24) {
      const userById = await collection.findOne({ _id: new ObjectId(username) });
      if (userById) return userById;
    }
  } catch (e) {
    // Not a valid ID, ignore
  }

  // If no username field, try matching name (case-insensitive, no spaces)
  const namePattern = new RegExp(`^${username}$`, 'i');
  user = await collection.findOne({
    $expr: {
      $eq: [
        { $replaceAll: { input: { $toLower: "$name" }, find: " ", replacement: "" } },
        username.toLowerCase()
      ]
    }
  });
  if (user) return user;

  // Last resort: check if username matches email prefix
  user = await collection.findOne({
    email: { $regex: `^${username}@`, $options: 'i' }
  });

  return user;
}

export async function findUserByPhone(phone: string) {
  const collection = await getCollection(COLLECTIONS.USERS);
  return collection.findOne({ phone });
}

export async function createUser(userData: any) {
  const collection = await getCollection(COLLECTIONS.USERS);
  const result = await collection.insertOne({
    ...userData,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return collection.findOne({ _id: result.insertedId });
}

export async function updateUser(userId: string, updateData: any) {
  const collection = await getCollection(COLLECTIONS.USERS);
  const _id = toObjectId(userId);
  if (!_id) return null;
  await collection.updateOne(
    { _id },
    { $set: { ...updateData, updatedAt: new Date() } }
  );
  return collection.findOne({ _id });
}

// Post helpers
export async function createPost(postData: any) {
  const collection = await getCollection(COLLECTIONS.POSTS);
  const result = await collection.insertOne({
    ...postData,
    createdAt: new Date(),
    updatedAt: new Date(),
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    viewsCount: 0,
  });
  return collection.findOne({ _id: result.insertedId });
}

export async function findPosts(limit: number = 20, skip: number = 0) {
  const collection = await getCollection(COLLECTIONS.POSTS);
  return collection
    .find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .toArray();
}

export async function findPostById(id: string) {
  const collection = await getCollection(COLLECTIONS.POSTS);
  const _id = toObjectId(id);
  if (!_id) return null;
  return collection.findOne({ _id });
}

export async function updatePost(postId: string, updateData: any) {
  const collection = await getCollection(COLLECTIONS.POSTS);
  const _id = toObjectId(postId);
  if (!_id) return null;
  await collection.updateOne(
    { _id },
    { $set: { ...updateData, updatedAt: new Date() } }
  );
  return collection.findOne({ _id });
}

export async function deletePost(postId: string) {
  const collection = await getCollection(COLLECTIONS.POSTS);
  const _id = toObjectId(postId);
  if (!_id) return null;
  return collection.deleteOne({ _id });
}

// Comment helpers
export async function createComment(commentData: any) {
  const collection = await getCollection(COLLECTIONS.COMMENTS);
  const result = await collection.insertOne({
    ...commentData,
    createdAt: new Date(),
  });
  return collection.findOne({ _id: result.insertedId });
}

export async function findCommentsByPostId(postId: string) {
  const collection = await getCollection(COLLECTIONS.COMMENTS);
  const _id = toObjectId(postId);
  if (!_id) return [];
  return collection.find({ postId: _id.toString() }).sort({ createdAt: -1 }).toArray();
}

// Like helpers
export async function toggleLike(userId: string, postId: string) {
  const collection = await getCollection(COLLECTIONS.LIKES);
  const existing = await collection.findOne({
    userId: userId.toString(),
    postId: postId.toString(),
  });

  if (existing) {
    await collection.deleteOne({ _id: existing._id });
    return { liked: false };
  } else {
    await collection.insertOne({
      userId: userId.toString(),
      postId: postId.toString(),
    });
    return { liked: true };
  }
}

export async function checkUserLikedPost(userId: string, postId: string) {
  const collection = await getCollection(COLLECTIONS.LIKES);
  return collection.findOne({
    userId: userId.toString(),
    postId: postId.toString(),
  });
}

export async function countLikes(postId: string) {
  const collection = await getCollection(COLLECTIONS.LIKES);
  return collection.countDocuments({ postId: postId.toString() });
}

// Follow helpers
export async function toggleFollow(followerId: string, followingId: string) {
  const collection = await getCollection(COLLECTIONS.FOLLOWS);
  const existing = await collection.findOne({
    followerId: followerId.toString(),
    followingId: followingId.toString(),
  });

  if (existing) {
    await collection.deleteOne({ _id: existing._id });
    return { following: false };
  } else {
    await collection.insertOne({
      followerId: followerId.toString(),
      followingId: followingId.toString(),
      createdAt: new Date(),
    });
    return { following: true };
  }
}

// Share helpers
export async function createShare(shareData: any) {
  const collection = await getCollection(COLLECTIONS.SHARES);
  const result = await collection.insertOne({
    ...shareData,
    createdAt: new Date(),
  });
  return collection.findOne({ _id: result.insertedId });
}

export async function checkUserSharedPost(userId: string, postId: string) {
  const collection = await getCollection(COLLECTIONS.SHARES);
  return collection.findOne({
    userId: userId.toString(),
    postId: postId.toString(),
  });
}

export async function countShares(postId: string) {
  const collection = await getCollection(COLLECTIONS.SHARES);
  return collection.countDocuments({ postId: postId.toString() });
}

// Notification helpers
export async function createNotification(notificationData: any) {
  const collection = await getCollection(COLLECTIONS.NOTIFICATIONS);
  const result = await collection.insertOne({
    ...notificationData,
    read: false,
    createdAt: new Date(),
  });
  return collection.findOne({ _id: result.insertedId });
}

export async function findNotificationsByUserId(userId: string, limit: number = 20, skip: number = 0) {
  const collection = await getCollection(COLLECTIONS.NOTIFICATIONS);
  return collection
    .find({ userId: userId.toString() })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .toArray();
}

export async function countUnreadNotifications(userId: string) {
  const collection = await getCollection(COLLECTIONS.NOTIFICATIONS);
  return collection.countDocuments({
    userId: userId.toString(),
    read: false,
  });
}

// Profile View helpers
export async function recordProfileView(viewerId: string, viewedId: string) {
  const collection = await getCollection(COLLECTIONS.PROFILE_VIEWS);

  // Update if exists (update timestamp), insert if not
  // This records the "last viewed" time
  await collection.updateOne(
    {
      viewerId: viewerId.toString(),
      viewedId: viewedId.toString()
    },
    {
      $set: {
        viewerId: viewerId.toString(),
        viewedId: viewedId.toString(),
        viewedAt: new Date()
      },
      $inc: { count: 1 }
    },
    { upsert: true }
  );
}

export async function getProfileViewers(userId: string, limit: number = 20, skip: number = 0) {
  const collection = await getCollection(COLLECTIONS.PROFILE_VIEWS);
  const usersCollection = await getCollection(COLLECTIONS.USERS);

  const views = await collection
    .find({ viewedId: userId.toString() })
    .sort({ viewedAt: -1 })
    .limit(limit)
    .skip(skip)
    .toArray();

  // Enhance with user details
  const viewers = await Promise.all(
    views.map(async (view) => {
      const viewerIdObj = toObjectId(view.viewerId);
      if (!viewerIdObj) return { ...view, viewer: null };

      const viewer = await usersCollection.findOne({
        _id: viewerIdObj
      });
      return {
        ...view,
        viewer: viewer ? {
          id: viewer._id.toString(),
          name: viewer.name,
          username: viewer.username,
          avatar: viewer.image || viewer.avatar,
          bio: viewer.bio
        } : null
      };
    })
  );

  return viewers.filter(v => v.viewer); // Only return existing users
}
