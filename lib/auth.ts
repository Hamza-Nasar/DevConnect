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
                guest: { label: "Guest", type: "text" }
            },
            async authorize(credentials) {
                // Import dependencies dynamically to avoid circular deps
                const { getCollection } = await import("@/lib/mongodb");
                const bcrypt = (await import("bcryptjs")).default;

                // 1. Guest Login
                if (credentials?.guest === "true") {
                    const usersCollection = await getCollection("users");

                    // Generate unique guest identifier
                    const timestamp = Date.now();
                    const randomNum = Math.floor(Math.random() * 10000);
                    const guestId = `guest_${timestamp}_${randomNum}`;
                    const name = `Guest ${Math.floor(Math.random() * 1000)}`;
                    const username = `guest_${randomNum}`;

                    const guestEmail = `${guestId}@guest.local`;

                    // Create new guest user
                    const result = await usersCollection.insertOne({
                        email: guestEmail,
                        name: name,
                        username: username,
                        guestAccount: true,
                        guestId: guestId,
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
                session.user.id = (token.d as string) || (token.sub as string) || (token.id as string) || '';
                session.user.email = (token.e as string) || (token.email as string) || null;
                session.user.name = (token.n as string) || (token.name as string) || null;
                session.user.username = (token.u as string) || (token.username as string) || null;
                session.user.image = (token.p as string) || (token.picture as string) || null;

                // Add accessToken if needed, but keep it small if possible
                if (token.a) (session as any).accessToken = token.a;
            }
            return session;
        },
        async jwt({ token, user, account, trigger, session }) {
            // For JWT strategy, store user info in token
            // Mapping short names for compression
            if (user) {
                token.d = user.id; // Using 'd' for ID
                token.e = user.email;
                token.n = user.name;
                token.u = user.username;
                token.p = user.image || user.avatar;

                // Clear long keys
                delete (token as any).name;
                delete (token as any).email;
                delete (token as any).picture;
            }

            // Ensure we have the MongoDB _id in the token (compressed as 'd')
            if (!token.d && token.e) {
                try {
                    const { getCollection } = await import("./mongodb");
                    const usersCollection = await getCollection("users");
                    const dbUser = await usersCollection.findOne({ email: token.e });
                    if (dbUser) {
                        token.d = dbUser._id.toString();
                    }
                } catch (e) {
                    console.error("Error fetching dbId for token:", e);
                }
            }

            // Handle session update
            if (trigger === "update" && session?.user) {
                if (session.user.username) token.u = session.user.username;
                if (session.user.name) token.n = session.user.name;
                if (session.user.image) token.p = session.user.image;
            }

            if (account) {
                // Keep accessToken but use short key 'a'
                token.a = account.access_token;
            }

            // Final cleanup of any potential long keys that NextAuth might have injected
            delete (token as any).name;
            delete (token as any).email;
            delete (token as any).picture;

            return token;
        },
        async redirect({ url, baseUrl }) {
            // Always redirect to /feed after successful authentication
            const feedUrl = `${baseUrl}/feed`;

            // If there's an error in the URL, redirect to feed anyway
            if (url.includes("error=") || url.includes("/error")) {
                return feedUrl;
            }

            // If URL is relative and is /feed, use it
            if (url === "/feed" || url.startsWith("/feed")) {
                return feedUrl;
            }

            // If URL is same origin and not login/signin/error, use it
            if (url.startsWith(baseUrl)) {
                if (url.includes("/login") || url.includes("/api/auth") || url.includes("/error")) {
                    return feedUrl;
                }
                return url;
            }

            // For any other case, redirect to feed
            return feedUrl;
        },
        async signIn({ user, account, profile }) {
            // Auto-create username for OAuth users
            if (account?.provider === "google" && user?.email) {
                try {
                    const { getCollection } = await import("./mongodb");

                    // Try to use new collection helpers, fallback to direct collection access
                    let getUsersCollection: any;
                    let createAccount: any;
                    let findAccountByProvider: any;

                    try {
                        const dbCollections = await import("./db-collections");
                        getUsersCollection = dbCollections.getUsersCollection;
                        createAccount = dbCollections.createAccount;
                        findAccountByProvider = dbCollections.findAccountByProvider;
                    } catch (e) {
                        // Fallback: use direct collection access
                        console.warn("db-collections not available, using fallback");
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

                    // Check if user exists
                    const existingUser = await usersCollection.findOne({ email: user.email });

                    let userId: string;

                    if (existingUser && !existingUser.username) {
                        userId = existingUser._id.toString();

                        // Generate username from name or email
                        const baseUsername = user.name
                            ? user.name.toLowerCase().replace(/\s+/g, '')
                            : user.email.split('@')[0];

                        let username = baseUsername;
                        let counter = 1;

                        // Find unique username
                        while (await usersCollection.findOne({ username })) {
                            username = `${baseUsername}${counter}`;
                            counter++;
                        }

                        // Update user with username
                        await usersCollection.updateOne(
                            { email: user.email },
                            {
                                $set: {
                                    username,
                                    updatedAt: new Date()
                                }
                            }
                        );
                    } else if (!existingUser) {
                        // Create new user with username
                        const baseUsername = user.name
                            ? user.name.toLowerCase().replace(/\s+/g, '')
                            : user.email.split('@')[0];

                        let username = baseUsername;
                        let counter = 1;

                        // Find unique username
                        while (await usersCollection.findOne({ username })) {
                            username = `${baseUsername}${counter}`;
                            counter++;
                        }

                        const result = await usersCollection.insertOne({
                            email: user.email,
                            name: user.name,
                            username,
                            image: user.image,
                            emailVerified: true,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        });

                        userId = result.insertedId.toString();
                    } else {
                        userId = existingUser._id.toString();
                    }

                    // Store OAuth account in separate accounts collection (optional - won't break if fails)
                    if (account && userId) {
                        try {
                            const existingAccount = await findAccountByProvider(
                                account.provider,
                                account.providerAccountId
                            );

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
                            } else {
                                // Update existing account
                                try {
                                    const accountsCollection = await getCollection("accounts");
                                    await accountsCollection.updateOne(
                                        { _id: existingAccount._id },
                                        {
                                            $set: {
                                                access_token: account.access_token,
                                                expires_at: account.expires_at,
                                                token_type: account.token_type,
                                                scope: account.scope,
                                                id_token: account.id_token,
                                                session_state: account.session_state,
                                                updatedAt: new Date(),
                                            }
                                        }
                                    );
                                } catch (updateError) {
                                    console.warn("Could not update account:", updateError);
                                    // Continue - account update is optional
                                }
                            }
                        } catch (accountError) {
                            // Account creation is optional - don't break auth flow
                            console.warn("Could not create/update account in accounts collection:", accountError);
                            // Auth will still work - user is created in users collection
                        }
                    }
                } catch (error) {
                    console.error("Error creating username for OAuth user:", error);
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
    // Only enable debug if explicitly set in env, otherwise disable to avoid warnings
    debug: process.env.NEXTAUTH_DEBUG === "true",
};
