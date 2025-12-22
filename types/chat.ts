export interface MessageReaction {
    emoji: string;
    userId: string;
    count: number;
}

export interface MessageEdit {
    content: string;
    createdAt: string;
}

export interface Message {
    id: string;
    _id?: string;
    content: string;
    senderId: string;
    receiverId: string;
    createdAt: string;
    read: boolean;
    delivered?: boolean;
    deliveredAt?: Date | string;
    readAt?: Date | string;
    type?: "text" | "image" | "file" | "video";
    imageUrl?: string;
    videoUrl?: string;
    fileUrl?: string;
    fileName?: string;
    parentMessageId?: string;
    reactions?: MessageReaction[];
    edits?: MessageEdit[];
    sender?: {
        id: string;
        name?: string;
        username?: string;
        avatar?: string;
        verified?: boolean;
        alternativeIds?: string[];
    };
}

export interface Chat {
    id: string;
    userId: string;
    user: {
        id: string;
        name?: string;
        username?: string;
        avatar?: string;
        status?: "online" | "offline" | "away";
        lastSeen?: string;
        verified?: boolean;
        alternativeIds?: string[];
    };
    lastMessage?: {
        content: string;
        createdAt: string;
        read: boolean;
    };
    unreadCount: number;
}
