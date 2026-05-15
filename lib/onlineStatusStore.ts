import { EventEmitter } from "events";
import getSocket from "./socket";

type PresenceStatus = "online" | "offline" | "away" | "busy";

class OnlineStatusStore extends EventEmitter {
  private onlineUsers: Set<string> = new Set();
  private statusByUser: Map<string, PresenceStatus> = new Map();
  private initialized = false;
  public connectionState: "connected" | "disconnected" | "reconnecting" = "disconnected";

  constructor() {
    super();
    this.setMaxListeners(100);
  }

  init() {
    if (typeof window === "undefined") return;
    if (this.initialized) return;

    const socket = getSocket();
    if (!socket) return;

    this.initialized = true;

    socket.on("initial_online_users", (userIds: string[]) => {
      this.onlineUsers.clear();
      this.statusByUser.clear();
      userIds.forEach((id) => {
        this.onlineUsers.add(id);
        this.statusByUser.set(id, "online");
      });
      this.emit("change");
    });

    socket.on("user_status", (data: { userId: string; status: string }) => {
      const status: PresenceStatus =
        data.status === "online" || data.status === "away" || data.status === "busy"
          ? data.status
          : "offline";
      this.statusByUser.set(data.userId, status);
      if (status === "online" || status === "away") {
        this.onlineUsers.add(data.userId);
      } else {
        this.onlineUsers.delete(data.userId);
      }
      this.emit("change");
    });

    if (socket.connected) {
      this.connectionState = "connected";
      socket.emit("get_online_users");
    }

    socket.on("connect", () => {
      this.connectionState = "connected";
      socket.emit("get_online_users");
      this.emit("change");
    });

    socket.on("disconnect", () => {
      this.connectionState = "disconnected";
      this.emit("change");
    });

    socket.on("reconnecting", () => {
      this.connectionState = "reconnecting";
      this.emit("change");
    });
  }

  reconnect() {
    this.onlineUsers.clear();
    this.statusByUser.clear();
    this.connectionState = "reconnecting";
    this.emit("change");
    const socket = getSocket();
    if (socket) socket.connect();
  }

  isUserOnline(userId?: string): boolean {
    if (!userId) return false;
    return this.onlineUsers.has(userId);
  }

  getUserStatus(userId?: string): PresenceStatus {
    if (!userId) return "offline";
    return this.statusByUser.get(userId) || "offline";
  }

  getOnlineUsers(): string[] {
    return Array.from(this.onlineUsers);
  }
}

export const onlineStatusStore = new OnlineStatusStore();
