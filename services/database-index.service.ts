import type { Collection, Document, IndexSpecification } from "mongodb";
import { COLLECTIONS } from "../lib/db";
import { getCollection } from "../lib/mongodb";

let indexesInitialized = false;

export async function ensureDatabaseIndexes() {
  if (indexesInitialized) return;

  const [users, messages, posts, follows] = await Promise.all([
    getCollection(COLLECTIONS.USERS),
    getCollection(COLLECTIONS.MESSAGES),
    getCollection(COLLECTIONS.POSTS),
    getCollection(COLLECTIONS.FOLLOWS),
  ]);

  await Promise.all([
    createIndexIfMissing(users, "users.email", { email: 1 }, { unique: true, sparse: true, background: true }),
    createIndexIfMissing(users, "users.username", { username: 1 }, { unique: true, sparse: true, background: true }),
    createIndexIfMissing(messages, "messages.conversation_created", { conversationId: 1, createdAt: -1 }, { background: true }),
    createIndexIfMissing(messages, "messages.participants_created", { senderId: 1, receiverId: 1, createdAt: -1 }, { background: true }),
    createIndexIfMissing(posts, "posts.createdAt", { createdAt: -1 }, { background: true }),
    createIndexIfMissing(follows, "follows.unique_pair", { followerId: 1, followingId: 1 }, { unique: true, background: true }),
  ]);

  indexesInitialized = true;
}

async function createIndexIfMissing(
  collection: Collection<Document>,
  name: string,
  key: IndexSpecification,
  options: Record<string, unknown>
) {
  try {
    const existingIndexes = await collection.listIndexes().toArray();
    const matchingKey = existingIndexes.find((index) => sameIndexKey(index.key, key));
    if (matchingKey) return;

    await collection.createIndex(key, options);
  } catch (error) {
    console.warn(`[DB] Index ${name} was not created:`, error);
  }
}

function sameIndexKey(existing: Document | undefined, expected: IndexSpecification) {
  return JSON.stringify(existing || {}) === JSON.stringify(expected);
}
