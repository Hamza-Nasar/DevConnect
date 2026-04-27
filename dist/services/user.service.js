"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findUserByAnyId = findUserByAnyId;
exports.findUserByEmailAddress = findUserByEmailAddress;
exports.getUserIdentityVariants = getUserIdentityVariants;
exports.buildAuthenticatedUser = buildAuthenticatedUser;
exports.markUserOnline = markUserOnline;
exports.markUserOffline = markUserOffline;
exports.publicUser = publicUser;
const db_1 = require("../lib/db");
const mongodb_1 = require("../lib/mongodb");
async function findUserByAnyId(userId) {
    const usersCollection = await (0, mongodb_1.getCollection)(db_1.COLLECTIONS.USERS);
    const objectId = (0, db_1.toObjectId)(userId);
    return usersCollection.findOne({
        $or: [{ _id: objectId || userId }, { id: userId }],
    });
}
async function findUserByEmailAddress(email) {
    const usersCollection = await (0, mongodb_1.getCollection)(db_1.COLLECTIONS.USERS);
    return usersCollection.findOne({ email });
}
async function getUserIdentityVariants(userId) {
    const variants = new Set([userId]);
    const user = await findUserByAnyId(userId);
    if (user === null || user === void 0 ? void 0 : user._id)
        variants.add(user._id.toString());
    if (user === null || user === void 0 ? void 0 : user.id)
        variants.add(user.id);
    return Array.from(variants);
}
async function buildAuthenticatedUser(userId) {
    const user = await findUserByAnyId(userId);
    if (!user)
        return null;
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
async function markUserOnline(userId) {
    const usersCollection = await (0, mongodb_1.getCollection)(db_1.COLLECTIONS.USERS);
    const user = await findUserByAnyId(userId);
    if (!user)
        return null;
    await usersCollection.updateOne({ _id: user._id }, { $set: { isOnline: true, lastSeen: new Date() } });
    return user;
}
async function markUserOffline(userId, lastSeen = new Date()) {
    const usersCollection = await (0, mongodb_1.getCollection)(db_1.COLLECTIONS.USERS);
    const user = await findUserByAnyId(userId);
    if (!user)
        return null;
    await usersCollection.updateOne({ _id: user._id }, { $set: { isOnline: false, lastSeen } });
    return user;
}
function publicUser(user) {
    var _a, _b;
    if (!user)
        return null;
    const id = ((_b = (_a = user._id) === null || _a === void 0 ? void 0 : _a.toString) === null || _b === void 0 ? void 0 : _b.call(_a)) || user.id;
    return {
        id,
        name: user.name || null,
        username: user.username || null,
        avatar: user.avatar || user.image || null,
        image: user.image || user.avatar || null,
        verified: user.verified || false,
        status: user.isOnline ? "online" : "offline",
        lastSeen: user.lastSeen,
        alternativeIds: user.id && user.id !== id ? [user.id] : [],
    };
}
