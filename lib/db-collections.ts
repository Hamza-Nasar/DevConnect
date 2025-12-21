// Database Collections Management
// یہ file ہر collection کے لیے proper helper functions provide کرتی ہے
// تاکہ data properly separated رہے

import { getCollection } from "./mongodb";
import { COLLECTIONS } from "./db";
import type {
  UserSchema,
  AccountSchema,
  PostSchema,
  CommentSchema,
  LikeSchema,
  ShareSchema,
  FollowSchema,
  NotificationSchema,
  SessionSchema,
  StorySchema,
  PollSchema,
  PollVoteSchema,
  MessageSchema,
  GroupSchema,
  GroupMemberSchema,
  GroupPostSchema,
  UserSettingsSchema,
  ProfileViewSchema,
} from "./db-schemas";

// ==================== USERS COLLECTION ====================
export async function getUsersCollection() {
  return await getCollection(COLLECTIONS.USERS);
}

// ==================== ACCOUNTS COLLECTION ====================
export async function getAccountsCollection() {
  return await getCollection(COLLECTIONS.ACCOUNTS);
}

export async function createAccount(accountData: Omit<AccountSchema, "_id">): Promise<AccountSchema> {
  const collection = await getAccountsCollection();
  const result = await collection.insertOne({
    ...accountData,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return collection.findOne({ _id: result.insertedId }) as Promise<AccountSchema>;
}

export async function findAccountByProvider(
  provider: string,
  providerAccountId: string
): Promise<AccountSchema | null> {
  const collection = await getAccountsCollection();
  return collection.findOne({
    provider,
    providerAccountId,
  }) as Promise<AccountSchema | null>;
}

export async function findAccountsByUserId(userId: string): Promise<AccountSchema[]> {
  const collection = await getAccountsCollection();
  return collection.find({ userId }).toArray() as Promise<AccountSchema[]>;
}

export async function deleteAccount(accountId: string): Promise<boolean> {
  const collection = await getAccountsCollection();
  const { toObjectId } = await import("./db");
  const _id = toObjectId(accountId);
  if (!_id) return false;
  const result = await collection.deleteOne({ _id });
  return result.deletedCount > 0;
}

// ==================== POSTS COLLECTION ====================
export async function getPostsCollection() {
  return await getCollection(COLLECTIONS.POSTS);
}

// ==================== COMMENTS COLLECTION ====================
export async function getCommentsCollection() {
  return await getCollection(COLLECTIONS.COMMENTS);
}

// ==================== LIKES COLLECTION ====================
export async function getLikesCollection() {
  return await getCollection(COLLECTIONS.LIKES);
}

// ==================== SHARES COLLECTION ====================
export async function getSharesCollection() {
  return await getCollection(COLLECTIONS.SHARES);
}

// ==================== FOLLOWS COLLECTION ====================
export async function getFollowsCollection() {
  return await getCollection(COLLECTIONS.FOLLOWS);
}

// ==================== NOTIFICATIONS COLLECTION ====================
export async function getNotificationsCollection() {
  return await getCollection(COLLECTIONS.NOTIFICATIONS);
}

// ==================== SESSIONS COLLECTION ====================
export async function getSessionsCollection() {
  return await getCollection(COLLECTIONS.SESSIONS);
}

// ==================== STORIES COLLECTION ====================
export async function getStoriesCollection() {
  return await getCollection(COLLECTIONS.STORIES);
}

// ==================== POLLS COLLECTION ====================
export async function getPollsCollection() {
  return await getCollection(COLLECTIONS.POLLS);
}

// ==================== POLL VOTES COLLECTION ====================
export async function getPollVotesCollection() {
  return await getCollection(COLLECTIONS.POLL_VOTES);
}

// ==================== MESSAGES COLLECTION ====================
export async function getMessagesCollection() {
  return await getCollection(COLLECTIONS.MESSAGES);
}

// ==================== GROUPS COLLECTION ====================
export async function getGroupsCollection() {
  return await getCollection(COLLECTIONS.GROUPS);
}

// ==================== GROUP MEMBERS COLLECTION ====================
export async function getGroupMembersCollection() {
  return await getCollection(COLLECTIONS.GROUP_MEMBERS);
}

// ==================== GROUP POSTS COLLECTION ====================
export async function getGroupPostsCollection() {
  return await getCollection(COLLECTIONS.GROUP_POSTS);
}

// ==================== USER SETTINGS COLLECTION ====================
export async function getUserSettingsCollection() {
  return await getCollection(COLLECTIONS.USER_SETTINGS);
}

// ==================== PROFILE VIEWS COLLECTION ====================
export async function getProfileViewsCollection() {
  return await getCollection(COLLECTIONS.PROFILE_VIEWS);
}

// ==================== DEVCONNECT METADATA COLLECTION ====================
export async function getDevConnectMetadataCollection() {
  return await getCollection(COLLECTIONS.METADATA);
}

export async function getCollectionsList() {
  const collection = await getDevConnectMetadataCollection();
  const metadata = await collection.findOne({ type: "collections_list" });
  return metadata?.collections || [];
}

export async function updateCollectionsList(collections: Array<{
  name: string;
  description: string;
  count?: number;
  lastUpdated?: Date;
}>) {
  const collection = await getDevConnectMetadataCollection();
  await collection.updateOne(
    { type: "collections_list" },
    {
      $set: {
        type: "collections_list",
        collections,
        updatedAt: new Date(),
      }
    },
    { upsert: true }
  );
}

export async function initializeDevConnectMetadata() {
  const collection = await getDevConnectMetadataCollection();
  const { COLLECTIONS } = await import("./db");
  const { getCollection } = await import("./mongodb");
  
  // Get all collections with their counts
  const collectionsList = await Promise.all(
    Object.values(COLLECTIONS).map(async (collectionName) => {
      try {
        const coll = await getCollection(collectionName);
        const count = await coll.countDocuments();
        return {
          name: collectionName,
          description: getCollectionDescription(collectionName),
          count,
          lastUpdated: new Date(),
        };
      } catch (error) {
        return {
          name: collectionName,
          description: getCollectionDescription(collectionName),
          count: 0,
          lastUpdated: new Date(),
        };
      }
    })
  );

  // Save collections list
  await collection.updateOne(
    { type: "collections_list" },
    {
      $set: {
        type: "collections_list",
        collections: collectionsList,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    },
    { upsert: true }
  );

  // Save project info
  await collection.updateOne(
    { type: "project_info" },
    {
      $set: {
        type: "project_info",
        projectInfo: {
          name: "DevConnect",
          version: "1.0.0",
          description: "Developer social network platform",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    },
    { upsert: true }
  );

  return collectionsList;
}

function getCollectionDescription(name: string): string {
  const descriptions: Record<string, string> = {
    users: "User profiles and basic information",
    accounts: "OAuth accounts (Google, etc.) - separate collection",
    posts: "All posts",
    comments: "Comments on posts",
    likedposts: "Post likes",
    sharedposts: "Post shares",
    follows: "User follows",
    notifications: "User notifications",
    sessions: "User sessions",
    stories: "Stories",
    polls: "Polls",
    pollvotes: "Poll votes",
    messages: "Direct messages",
    groups: "Groups",
    groupmembers: "Group members",
    groupposts: "Group posts",
    usersettings: "User settings",
    profileviews: "Profile views",
    devconnect: "Project metadata - collections list",
  };
  return descriptions[name] || `${name} collection`;
}

