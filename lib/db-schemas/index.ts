// Database Schema Definitions
// یہ file ہر collection کے لیے proper schema definitions contain کرتی ہے

export interface UserSchema {
  _id?: any;
  email: string;
  name?: string;
  username?: string;
  phone?: string;
  password?: string; // hashed
  image?: string;
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  verified?: boolean;
  guestAccount?: boolean;
  guestId?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  createdAt: Date;
  updatedAt: Date;
  postsCount?: number;
  followersCount?: number;
  followingCount?: number;
}

export interface AccountSchema {
  _id?: any;
  userId: string; // Reference to users collection
  type: string; // "oauth" | "credentials" | "phone"
  provider: string; // "google" | "credentials" | "phone"
  providerAccountId: string;
  refresh_token?: string;
  access_token?: string;
  expires_at?: number;
  token_type?: string;
  scope?: string;
  id_token?: string;
  session_state?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostSchema {
  _id?: any;
  userId: string; // Reference to users collection
  title?: string;
  content: string;
  images?: string[];
  video?: string;
  hashtags?: string[];
  location?: string;
  isPublic?: boolean;
  postType?: "tip" | "bug" | "library" | "announcement" | "regular";
  codeSnippet?: {
    code: string;
    language: string;
  };
  language?: string;
  framework?: string;
  savedToKnowledgeBase?: boolean;
  linkPreview?: {
    url: string;
    title: string;
    description?: string;
    image?: string;
  };
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommentSchema {
  _id?: any;
  postId: string; // Reference to posts collection
  userId: string; // Reference to users collection
  content: string;
  parentId?: string; // For nested comments
  likesCount?: number;
  createdAt: Date;
  updatedAt?: Date;
}

export interface LikeSchema {
  _id?: any;
  userId: string; // Reference to users collection
  postId: string; // Reference to posts collection
  createdAt: Date;
}

export interface ShareSchema {
  _id?: any;
  userId: string; // Reference to users collection
  postId: string; // Reference to posts collection
  createdAt: Date;
}

export interface FollowSchema {
  _id?: any;
  followerId: string; // Reference to users collection
  followingId: string; // Reference to users collection
  createdAt: Date;
}

export interface NotificationSchema {
  _id?: any;
  userId: string; // Reference to users collection
  type: string; // "like" | "comment" | "follow" | "mention" | etc.
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: Date;
}

export interface SessionSchema {
  _id?: any;
  sessionToken: string;
  userId: string; // Reference to users collection
  expires: Date;
}

export interface StorySchema {
  _id?: any;
  userId: string; // Reference to users collection
  image?: string;
  video?: string;
  text?: string;
  expiresAt: Date;
  viewsCount?: number;
  createdAt: Date;
}

export interface PollSchema {
  _id?: any;
  postId: string; // Reference to posts collection
  question: string;
  options: Array<{
    id: string;
    text: string;
    votes: number;
  }>;
  expiresAt?: Date;
  createdAt: Date;
}

export interface PollVoteSchema {
  _id?: any;
  pollId: string; // Reference to polls collection
  userId: string; // Reference to users collection
  optionId: string;
  createdAt: Date;
}

export interface MessageSchema {
  _id?: any;
  senderId: string; // Reference to users collection
  receiverId: string; // Reference to users collection
  content: string;
  images?: string[];
  read: boolean;
  readAt?: Date;
  createdAt: Date;
}

export interface GroupSchema {
  _id?: any;
  name: string;
  description?: string;
  creatorId: string; // Reference to users collection
  image?: string;
  isPublic?: boolean;
  membersCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupMemberSchema {
  _id?: any;
  groupId: string; // Reference to groups collection
  userId: string; // Reference to users collection
  role?: "admin" | "member";
  joinedAt: Date;
}

export interface GroupPostSchema {
  _id?: any;
  groupId: string; // Reference to groups collection
  postId: string; // Reference to posts collection
  createdAt: Date;
}

export interface UserSettingsSchema {
  _id?: any;
  userId: string; // Reference to users collection
  notifications?: {
    email?: boolean;
    push?: boolean;
    likes?: boolean;
    comments?: boolean;
    follows?: boolean;
  };
  privacy?: {
    profileVisibility?: "public" | "private";
    showEmail?: boolean;
    showPhone?: boolean;
  };
  theme?: "light" | "dark" | "auto";
  language?: string;
  updatedAt: Date;
}

export interface ProfileViewSchema {
  _id?: any;
  viewerId: string; // Reference to users collection
  viewedId: string; // Reference to users collection
  viewedAt: Date;
  count?: number;
}

export interface DevConnectMetadataSchema {
  _id?: any;
  type: "collections_list" | "project_info" | "schema_version";
  collections?: Array<{
    name: string;
    description: string;
    count?: number;
    lastUpdated?: Date;
  }>;
  projectInfo?: {
    name: string;
    version: string;
    description?: string;
  };
  schemaVersion?: string;
  createdAt: Date;
  updatedAt: Date;
}

