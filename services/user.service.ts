import { ObjectId } from "mongodb";
import { COLLECTIONS, toObjectId } from "../lib/db";
import { getCollection } from "../lib/mongodb";

export interface AuthenticatedUser {
  id: string;
  oauthId?: string;
  email?: string | null;
  name?: string | null;
  username?: string | null;
  role?: string;
  image?: string | null;
}

export async function findUserByAnyId(userId: string) {
  const usersCollection = await getCollection(COLLECTIONS.USERS);
  const objectId = toObjectId(userId);

  return usersCollection.findOne({
    $or: [{ _id: objectId || (userId as unknown as ObjectId) }, { id: userId }],
  });
}

export async function findUserByEmailAddress(email: string) {
  const usersCollection = await getCollection(COLLECTIONS.USERS);
  return usersCollection.findOne({ email });
}

export async function getUserIdentityVariants(userId: string): Promise<string[]> {
  const variants = new Set<string>([userId]);
  const user = await findUserByAnyId(userId);

  if (user?._id) variants.add(user._id.toString());
  if (user?.id) variants.add(user.id);

  return Array.from(variants);
}

export async function buildAuthenticatedUser(userId: string): Promise<AuthenticatedUser | null> {
  const user = await findUserByAnyId(userId);
  if (!user) return null;

  return {
    id: user._id.toString(),
    oauthId: user.id,
    email: user.email || null,
    name: user.name || null,
    username: user.username || null,
    role: user.role || "USER",
    image: user.image || user.avatar || null,
  };
}

export async function markUserOnline(userId: string) {
  const usersCollection = await getCollection(COLLECTIONS.USERS);
  const user = await findUserByAnyId(userId);
  if (!user) return null;

  await usersCollection.updateOne(
    { _id: user._id },
    { $set: { isOnline: true, lastSeen: new Date() } }
  );

  return user;
}

export async function markUserOffline(userId: string, lastSeen = new Date()) {
  const usersCollection = await getCollection(COLLECTIONS.USERS);
  const user = await findUserByAnyId(userId);
  if (!user) return null;

  await usersCollection.updateOne(
    { _id: user._id },
    { $set: { isOnline: false, lastSeen } }
  );

  return user;
}

export async function touchUserHeartbeat(userId: string, seenAt = new Date()) {
  const usersCollection = await getCollection(COLLECTIONS.USERS);
  const user = await findUserByAnyId(userId);
  if (!user) return null;

  await usersCollection.updateOne(
    { _id: user._id },
    { $set: { isOnline: true, lastSeen: seenAt } }
  );

  return user;
}

export function publicUser(user: any) {
  if (!user) return null;

  const id = user._id?.toString?.() || user.id;
  const lastSeenDate = user.lastSeen ? new Date(user.lastSeen) : null;
  const freshnessWindowMs = 2 * 60 * 1000; // 2 minutes
  const isFreshlyOnline =
    Boolean(user.isOnline) &&
    Boolean(lastSeenDate && Date.now() - lastSeenDate.getTime() <= freshnessWindowMs);

  return {
    id,
    name: user.name || null,
    username: user.username || null,
    avatar: user.avatar || user.image || null,
    image: user.image || user.avatar || null,
    verified: user.verified || false,
    status: isFreshlyOnline ? "online" : "offline",
    lastSeen: user.lastSeen,
    alternativeIds: user.id && user.id !== id ? [user.id] : [],
  };
}
