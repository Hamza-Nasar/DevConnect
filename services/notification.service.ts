import { createNotification as createNotificationRecord } from "../lib/db";

export interface NotificationInput {
  userId: string;
  actorId?: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  read?: boolean;
  createdAt?: Date;
}

export async function createNotification(input: NotificationInput) {
  return createNotificationRecord({
    ...input,
    read: input.read ?? false,
    createdAt: input.createdAt || new Date(),
  });
}
