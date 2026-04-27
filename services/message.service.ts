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

  const [sentMessages, receivedMessages] = await Promise.all([
    messagesCollection.find({ senderId: { $in: userIds } }).toArray(),
    messagesCollection.find({ receiverId: { $in: userIds } }).toArray(),
  ]);

  const chatUserIds = new Set<string>();
  sentMessages.forEach((message) => chatUserIds.add(message.receiverId));
  receivedMessages.forEach((message) => chatUserIds.add(message.senderId));

  const chatsMap = new Map<string, { userId: string; originalIds: Set<string>; user: any }>();

  for (const otherId of chatUserIds) {
    const otherIdObj = toObjectId(otherId);
    const otherUser = await usersCollection.findOne({
      $or: [{ _id: otherIdObj || (otherId as any) }, { id: otherId }],
    });

    if (!otherUser) continue;

    const primaryId = otherUser._id.toString();
    const existing = chatsMap.get(primaryId);

    if (!existing) {
      chatsMap.set(primaryId, {
        userId: primaryId,
        originalIds: new Set([otherId]),
        user: publicUser(otherUser),
      });
    } else {
      existing.originalIds.add(otherId);
      if (otherId !== primaryId && !existing.user.alternativeIds.includes(otherId)) {
        existing.user.alternativeIds.push(otherId);
      }
    }
  }

  const chats = await Promise.all(
    Array.from(chatsMap.values()).map(async (chatInfo) => {
      const participantIds = Array.from(chatInfo.originalIds);
      const participantIdObj = toObjectId(chatInfo.userId);
      if (!participantIdObj) return null;

      const participantUser = await usersCollection.findOne({ _id: participantIdObj });
      if (participantUser?.id && !participantIds.includes(participantUser.id)) {
        participantIds.push(participantUser.id);
      }

      const [lastMessage] = await messagesCollection
        .find({
          $or: [
            { senderId: { $in: userIds }, receiverId: { $in: participantIds } },
            { senderId: { $in: participantIds }, receiverId: { $in: userIds } },
          ],
        })
        .sort({ createdAt: -1 })
        .limit(1)
        .toArray();

      const unreadCount = await messagesCollection.countDocuments({
        senderId: { $in: participantIds },
        receiverId: { $in: userIds },
        read: false,
      });

      return {
        id: chatInfo.userId,
        userId: chatInfo.userId,
        user: chatInfo.user,
        lastMessage: lastMessage
          ? {
              content: lastMessage.content,
              createdAt: lastMessage.createdAt,
              read: lastMessage.read,
              senderId: chatInfo.originalIds.has(lastMessage.senderId)
                ? chatInfo.userId
                : lastMessage.senderId,
              receiverId: chatInfo.originalIds.has(lastMessage.receiverId)
                ? chatInfo.userId
                : lastMessage.receiverId,
            }
          : undefined,
        unreadCount,
      };
    })
  );

  return chats.filter(Boolean);
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
