import { getCollection } from "../lib/mongodb";
import { COLLECTIONS, toObjectId } from "../lib/db";
import { getUserIdentityVariants, publicUser } from "./user.service";

export interface CreateMessageInput {
  senderId: string;
  receiverId: string;
  content?: string;
  type?: "text" | "image" | "file" | "video";
  imageUrl?: string;
  videoUrl?: string;
  fileUrl?: string;
  fileName?: string;
}

export async function getMessageThreadsForUser(userId: string) {
  const messagesCollection = await getCollection(COLLECTIONS.MESSAGES);
  const usersCollection = await getCollection(COLLECTIONS.USERS);
  const userIds = await getUserIdentityVariants(userId);

  const conversations = await messagesCollection
    .aggregate([
      {
        $match: {
          $or: [{ senderId: { $in: userIds } }, { receiverId: { $in: userIds } }],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $addFields: {
          otherUserId: {
            $cond: [{ $in: ["$senderId", userIds] }, "$receiverId", "$senderId"],
          },
          unreadForCurrent: {
            $cond: [
              {
                $and: [
                  { $in: ["$receiverId", userIds] },
                  { $eq: ["$read", false] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
      {
        $group: {
          _id: "$otherUserId",
          lastMessage: { $first: "$$ROOT" },
          unreadCount: { $sum: "$unreadForCurrent" },
        },
      },
      { $sort: { "lastMessage.createdAt": -1 } },
    ])
    .toArray();

  const otherIds = conversations.map((conversation: any) => conversation._id).filter(Boolean);
  const otherObjectIds = otherIds
    .map((id: string) => toObjectId(id))
    .filter((id): id is NonNullable<typeof id> => id !== null);

  const users = await usersCollection
    .find({
      $or: [{ _id: { $in: otherObjectIds } }, { id: { $in: otherIds } }],
    })
    .toArray();

  const userByDbId = new Map(users.map((user) => [user._id?.toString?.(), user]));
  const userByAltId = new Map(users.filter((user) => user.id).map((user) => [user.id, user]));

  return conversations
    .map((conversation: any) => {
      const otherId = conversation._id as string;
      const otherUser = userByDbId.get(otherId) || userByAltId.get(otherId);
      if (!otherUser) return null;

      const normalizedId = otherUser._id.toString();
      const lastMessage = conversation.lastMessage;

      return {
        id: normalizedId,
        userId: normalizedId,
        user: publicUser(otherUser),
        lastMessage: lastMessage
          ? {
              content: lastMessage.content,
              createdAt: lastMessage.createdAt,
              read: lastMessage.read,
              senderId: lastMessage.senderId === otherId ? normalizedId : lastMessage.senderId,
              receiverId: lastMessage.receiverId === otherId ? normalizedId : lastMessage.receiverId,
            }
          : undefined,
        unreadCount: conversation.unreadCount || 0,
      };
    })
    .filter(Boolean);
}

export async function createMessage(input: CreateMessageInput) {
  const messagesCollection = await getCollection(COLLECTIONS.MESSAGES);
  const content =
    input.content ||
    (input.imageUrl
      ? "[Image]"
      : input.videoUrl
        ? "[Video]"
        : input.fileUrl
          ? `[File: ${input.fileName || "File"}]`
          : "");

  const conversationId = buildConversationId(input.senderId, input.receiverId);
  const message: any = {
    senderId: input.senderId,
    receiverId: input.receiverId,
    conversationId,
    content,
    type: input.type || "text",
    read: false,
    createdAt: new Date().toISOString(),
  };

  if (input.imageUrl) message.imageUrl = input.imageUrl;
  if (input.videoUrl) message.videoUrl = input.videoUrl;
  if (input.fileUrl) message.fileUrl = input.fileUrl;
  if (input.fileName) message.fileName = input.fileName;

  const result = await messagesCollection.insertOne(message);

  return {
    id: result.insertedId.toString(),
    ...message,
  };
}

export function buildConversationId(userA: string, userB: string) {
  return [userA, userB].sort().join(":");
}
