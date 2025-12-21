import { EventEmitter } from "events";
import getSocket from "./socket";

class OnlineStatusStore extends EventEmitter {
    private onlineUsers: Set<string> = new Set();
    private initialized = false;
    public connectionState: 'connected' | 'disconnected' | 'reconnecting' = 'disconnected';

    constructor() {
        super();
    }

    init() {
        if (typeof window === "undefined") return;

        const socket = getSocket();
        if (!socket) return;

        if (this.initialized) {
            // If already initialized, just ensure we request data again if called
            if (socket.connected) {
                socket.emit("get_online_users");
            }
            return;
        }

        this.initialized = true;

        // Listen for initial list
        socket.on("initial_online_users", (userIds: string[]) => {
            console.log("👥 [OnlineStatusStore] Received initial online users:", userIds.length);
            this.onlineUsers.clear(); // Fresh start
            userIds.forEach(id => this.onlineUsers.add(id));
            this.emit("change");
        });

        // Listen for status changes
        socket.on("user_status", (data: { userId: string; status: string }) => {
            console.log(`👤 [OnlineStatusStore] Status change: ${data.userId} -> ${data.status}`);
            if (data.status === "online") {
                this.onlineUsers.add(data.userId);
            } else {
                this.onlineUsers.delete(data.userId);
            }
            this.emit("change");
        });

        // Request initial list immediately if socket connected
        if (socket.connected) {
            this.connectionState = 'connected';
            socket.emit("get_online_users");
        }

        // And on connect/reconnect
        socket.on("connect", () => {
            console.log("🔄 [OnlineStatusStore] Socket connected, fetching status list");
            this.connectionState = 'connected';
            socket.emit("get_online_users");
            this.emit("change");
        });

        socket.on("disconnect", (reason) => {
            console.log("🔌 [OnlineStatusStore] Socket disconnected:", reason);
            this.connectionState = 'disconnected';
            this.emit("change");
        });

        socket.on("reconnecting", () => {
            this.connectionState = 'reconnecting';
            this.emit("change");
        });
    }

    reconnect() {
        this.onlineUsers.clear();
        this.connectionState = 'reconnecting';
        this.emit("change");
        const socket = getSocket();
        if (socket) {
            socket.connect();
        }
    }

    isUserOnline(userId?: string): boolean {
        if (!userId) return false;
        return this.onlineUsers.has(userId);
    }

    getOnlineUsers(): string[] {
        return Array.from(this.onlineUsers);
    }
}

export const onlineStatusStore = new OnlineStatusStore();
