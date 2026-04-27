"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureDatabaseIndexes = ensureDatabaseIndexes;
const db_1 = require("../lib/db");
const mongodb_1 = require("../lib/mongodb");
let indexesInitialized = false;
async function ensureDatabaseIndexes() {
    if (indexesInitialized)
        return;
    const [users, messages, posts, follows] = await Promise.all([
        (0, mongodb_1.getCollection)(db_1.COLLECTIONS.USERS),
        (0, mongodb_1.getCollection)(db_1.COLLECTIONS.MESSAGES),
        (0, mongodb_1.getCollection)(db_1.COLLECTIONS.POSTS),
        (0, mongodb_1.getCollection)(db_1.COLLECTIONS.FOLLOWS),
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
async function createIndexIfMissing(collection, name, key, options) {
    try {
        const existingIndexes = await collection.listIndexes().toArray();
        const matchingKey = existingIndexes.find((index) => sameIndexKey(index.key, key));
        if (matchingKey)
            return;
        await collection.createIndex(key, options);
    }
    catch (error) {
        console.warn(`[DB] Index ${name} was not created:`, error);
    }
}
function sameIndexKey(existing, expected) {
    return JSON.stringify(existing || {}) === JSON.stringify(expected);
}
