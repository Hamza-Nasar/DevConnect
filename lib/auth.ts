import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { AuthOptions } from "next-auth";

// MongoDB adapter is disabled - using JWT sessions only
// This prevents NextAuth from failing when MongoDB is not available
let adapter: any = undefined;

export const authOptions: AuthOptions = {
    // No adapter - using JWT strategy only
    session: {
        strategy: "jwt", // Force JWT to avoid MongoDB connection issues
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    providers: [
        // Google provider with fallback credentials for development
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "dummy-client-id-for-dev",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "dummy-client-secret-for-dev",
        }),
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" },
                phone: { label: "Phone", type: "text" },
                guest: { label: "Guest", type: "text" },
                deviceId: { label: "Device ID", type: "text" }
            },
            async authorize(credentials) {
                // Import dependencies dynamically to avoid circular deps
                const { getCollection } = await import("@/lib/mongodb");
                const bcrypt = (await import("bcryptjs")).default;

                // 1. Guest Login
                if (credentials?.guest === "true") {
                    const usersCollection = await getCollection("users");
                    const deviceId = credentials?.deviceId;

                    // Check if this device already has a guest account
                    if (deviceId) {
                        const existingGuest = await usersCollection.findOne({ guestId: deviceId });
                        if (existingGuest) {
                            return {
                                id: existingGuest._id.toString(),
                                email: existingGuest.email,
                                name: existingGuest.name,
                                username: existingGuest.username,
                                image: existingGuest.image || existingGuest.avatar,
                                guestAccount: true
                            };
                        }
                    }

                    // Generate unique guest identifier (or use deviceId if provided)
                    const guestId = deviceId || `guest_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
                    const randomNum = Math.floor(Math.random() * 1000);
                    const name = `Guest ${randomNum}`;
                    const username = `guest_${Math.floor(Math.random() * 10000)}`;
                    const guestEmail = `${guestId}@guest.local`;

                    // Create new guest user
                    const result = await usersCollection.insertOne({
                        email: guestEmail,
                        name: name,
                        username: username,
                        guestAccount: true,
                        guestId: guestId, // Using deviceId or generated ID here
                        emailVerified: false,
                        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    });

                    return {
                        id: result.insertedId.toString(),
                        email: guestEmail,
                        name: name,
                        username: username,
                        image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
                        guestAccount: true
                    };
                }

                // 2. Email/Password Login
                if (credentials?.email && credentials?.password) {
                    const usersCollection = await getCollection("users");
                    const user = await usersCollection.findOne({ email: credentials.email });

                    if (user && user.password) {
                        const isValid = await bcrypt.compare(credentials.password, user.password);
                        if (isValid) {
                            return {
                                id: user._id.toString(),
                                email: user.email,
                                name: user.name,
                                username: user.username,
                                image: user.image || user.avatar,
                            };
                        }
                    }
                    return null;
                }

                return null;
            }
        }),
    ],
    callbacks: {
        async session({ session, token }) {
            if (session?.user && token) {
                // Map from minified keys back to original names
                // IMPORTANT: session.user.id is now ALWAYS the MongoDB _id (stored in token.d)
                session.user.id = (token.d as string) || (token.sub as string) || '';
                session.user.email = (token.e as string) || (token.email as string) || null;
                session.user.name = (token.n as string) || (token.name as string) || null;
                session.user.username = (token.u as string) || (token.username as string) || null;

                // Get the image from the token
                let image = (token.p as string) || (token.picture as string) || null;

                // If it's a large base64 string, replace it with the proxy URL
                // This is a safety measure in case the token still has it
                if (image && image.startsWith('data:image') && image.length > 1000) {
                    image = `/api/avatars/${session.user.id}?v=${Date.now()}`;
                }

                session.user.image = image;
                session.user.role = (token.r as string) || "USER";

                // Add accessToken if needed
                if (token.a) (session as any).accessToken = token.a;
            }
            return session;
        },
        async jwt({ token, user, account, trigger, session }) {
            // Helper to clean image
            const cleanImage = (id: string, img: string | null | undefined) => {
                if (img && img.startsWith('data:image') && img.length > 500) {
                    return `/api/avatars/${id}?v=${Date.now()}`;
                }
                return img;
            };

            // For JWT strategy, store user info in token
            if (user) {
                // CRITICAL: We want token.d to be the MongoDB _id string.
                // For Credentials/Guest, user.id is already the _id string.
                // For Google, we'll fetch it from the DB in the next step or during signIn.
                token.d = user.id;
                token.e = user.email;
                token.n = user.name;
                token.u = user.username;
                token.p = cleanImage(user.id, user.image || (user as any).avatar);
                token.r = (user as any).role || "USER";

                // Clear long keys
                delete (token as any).name;
                delete (token as any).email;
                delete (token as any).picture;
            }

            // Ensure we have the MongoDB _id in the token (compressed as 'd')
            // This is especially important for Google users where user.id is the OAuth ID initially.
            if (token.e && (!token.d || (token.d as string).length > 24)) {
                try {
                    const { getCollection } = await import("./mongodb");
                    const usersCollection = await getCollection("users");
                    const dbUser = await usersCollection.findOne({ email: token.e });
                    if (dbUser) {
                        token.d = dbUser._id.toString();
                        token.r = dbUser.role || "USER";
                        // Re-check image if we just found the ID
                        if (token.p && (token.p as string).startsWith('data:image')) {
                            token.p = cleanImage(token.d as string, token.p as string);
                        }
                    }
                } catch (e) {
                    console.error("Error fetching dbId for token:", e);
                }
            }

            // Handle session update
            if (trigger === "update" && session?.user) {
                if (session.user.username) token.u = session.user.username;
                if (session.user.name) token.n = session.user.name;
                if (session.user.image) {
                    const userId = (token.d as string) || (token.sub as string);
                    token.p = cleanImage(userId, session.user.image);
                }
            }

            if (account) {
                token.a = account.access_token;
            }

            // Cleanup
            delete (token as any).name;
            delete (token as any).email;
            delete (token as any).picture;

            return token;
        },
        async redirect({ url, baseUrl }) {
            const feedUrl = `${baseUrl}/feed`;
            if (url.includes("error=") || url.includes("/error")) return feedUrl;
            if (url === "/feed" || url.startsWith("/feed")) return feedUrl;
            if (url.startsWith(baseUrl)) {
                if (url.includes("/login") || url.includes("/api/auth") || url.includes("/error")) return feedUrl;
                return url;
            }
            return feedUrl;
        },
        async signIn({ user, account, profile }) {
            if (account?.provider === "google" && user?.email) {
                try {
                    const { getCollection } = await import("./mongodb");
                    let getUsersCollection: any;
                    let createAccount: any;
                    let findAccountByProvider: any;

                    try {
                        const dbCollections = await import("./db-collections");
                        getUsersCollection = dbCollections.getUsersCollection;
                        createAccount = dbCollections.createAccount;
                        findAccountByProvider = dbCollections.findAccountByProvider;
                    } catch (e) {
                        getUsersCollection = () => getCollection("users");
                        createAccount = async (data: any) => {
                            const accountsCollection = await getCollection("accounts");
                            const result = await accountsCollection.insertOne({
                                ...data,
                                createdAt: new Date(),
                                updatedAt: new Date(),
                            });
                            return accountsCollection.findOne({ _id: result.insertedId });
                        };
                        findAccountByProvider = async (provider: string, providerAccountId: string) => {
                            const accountsCollection = await getCollection("accounts");
                            return accountsCollection.findOne({ provider, providerAccountId });
                        };
                    }

                    const usersCollection = await getUsersCollection();
                    const existingUser = await usersCollection.findOne({ email: user.email });

                    let userId: string;

                    if (existingUser) {
                        userId = existingUser._id.toString();

                        // Update existing user with OAuth ID and username if missing
                        const updateData: any = { updatedAt: new Date() };
                        if (!existingUser.id) updateData.id = user.id; // Store Google ID

                        if (!existingUser.username) {
                            const baseUsername = user.name ? user.name.toLowerCase().replace(/\s+/g, '') : user.email.split('@')[0];
                            let username = baseUsername;
                            let counter = 1;
                            while (await usersCollection.findOne({ username })) {
                                username = `${baseUsername}${counter}`;
                                counter++;
                            }
                            updateData.username = username;
                        }

                        await usersCollection.updateOne(
                            { email: user.email },
                            { $set: updateData }
                        );
                    } else {
                        // Create new user with username AND Google ID
                        const baseUsername = user.name ? user.name.toLowerCase().replace(/\s+/g, '') : user.email.split('@')[0];
                        let username = baseUsername;
                        let counter = 1;
                        while (await usersCollection.findOne({ username })) {
                            username = `${baseUsername}${counter}`;
                            counter++;
                        }

                        const result = await usersCollection.insertOne({
                            id: user.id, // Store Google ID
                            email: user.email,
                            name: user.name,
                            username,
                            image: user.image,
                            emailVerified: true,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        });

                        userId = result.insertedId.toString();
                    }

                    if (account && userId) {
                        try {
                            const existingAccount = await findAccountByProvider(account.provider, account.providerAccountId);
                            if (!existingAccount) {
                                await createAccount({
                                    userId,
                                    type: account.type || "oauth",
                                    provider: account.provider,
                                    providerAccountId: account.providerAccountId,
                                    access_token: account.access_token,
                                    expires_at: account.expires_at,
                                    token_type: account.token_type,
                                    scope: account.scope,
                                    id_token: account.id_token,
                                    session_state: account.session_state,
                                });
                            }
                        } catch (accountError) {
                            console.warn("Could not handle account entry:", accountError);
                        }
                    }
                } catch (error) {
                    console.error("Error in signIn callback:", error);
                }
            }
            return true;
        },
    },
    pages: {
        signIn: "/login",
        error: "/error",
    },
    secret: process.env.NEXTAUTH_SECRET || "dev-secret-change-in-production-min-32-chars-long",
    debug: process.env.NEXTAUTH_DEBUG === "true",
};
