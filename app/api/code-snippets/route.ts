import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { toObjectId, toStringId } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const language = searchParams.get("language");
    const query = searchParams.get("q");

    const snippetsCollection = await getCollection("codeSnippets");
    const usersCollection = await getCollection("users");

    let filter: any = {};
    if (language && language !== "all") {
      filter.language = language;
    }
    if (query) {
      filter.$or = [
        { title: new RegExp(query, "i") },
        { description: new RegExp(query, "i") },
        { tags: { $in: [new RegExp(query, "i")] } },
      ];
    }

    const snippets = await snippetsCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    // Populate user data
    const accountsCollection = await getCollection("accounts");
    
    for (const snippet of snippets) {
      if (snippet.userId) {
        const userIdObj = toObjectId(snippet.userId);
        let user = null;
        
        // Method 1: Try to find user by ObjectId
        if (userIdObj) {
          user = await usersCollection.findOne({ _id: userIdObj });
        }
        
        // Method 2: Try string ID lookup if ObjectId lookup failed
        if (!user) {
          user = await usersCollection.findOne({ _id: snippet.userId });
        }
        
        // Method 3: Try finding by OAuth account (for Google OAuth users)
        if (!user) {
          const account = await accountsCollection.findOne({ 
            providerAccountId: snippet.userId 
          });
          if (account?.userId) {
            const accountUserIdObj = toObjectId(account.userId);
            if (accountUserIdObj) {
              user = await usersCollection.findOne({ _id: accountUserIdObj });
            }
          }
        }
        
        // If user found, format user data with proper fallbacks
        if (user) {
          // Priority: nickname (name) -> email prefix -> username -> generated nickname
          // Always prefer nickname (name) over username
          let displayName = user.name; // Nickname/Display Name (first priority)
          
          // If no nickname, try email prefix (more readable than username)
          if (!displayName && user.email) {
            displayName = user.email.split("@")[0];
          }
          
          // If still no name, try username as fallback
          if (!displayName && user.username) {
            displayName = user.username;
          }
          
          // If still no name, generate a nickname from user ID
          if (!displayName) {
            const userId = toStringId(user._id) || snippet.userId;
            // Generate nickname: take first 8 characters and add "user" prefix
            displayName = `user${userId.slice(0, 8)}`;
          }
          
          snippet.user = {
            id: toStringId(user._id) || snippet.userId,
            name: displayName, // This will be nickname (name field)
            avatar: user.avatar || user.image || null,
          };
        } else {
          // If user not found, generate nickname from userId
          const nickname = snippet.userId.length > 10 
            ? `user${snippet.userId.slice(0, 8)}`
            : `user${snippet.userId}`;
          
          snippet.user = {
            id: snippet.userId,
            name: nickname,
            avatar: null,
          };
        }
      }
    }

    return NextResponse.json({ snippets });
  } catch (error: any) {
    console.error("Error fetching code snippets:", error);
    return NextResponse.json(
      { error: "Failed to fetch code snippets" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, code, language, tags } = body;

    if (!title || !code) {
      return NextResponse.json(
        { error: "Title and code are required" },
        { status: 400 }
      );
    }

    const snippetsCollection = await getCollection("codeSnippets");
    const snippet = {
      title,
      description: description || "",
      code,
      language: language || "javascript",
      tags: tags || [],
      userId: session.user.id,
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      viewsCount: 0,
      forksCount: 0,
      createdAt: new Date().toISOString(),
    };

    const result = await snippetsCollection.insertOne(snippet);

    return NextResponse.json({
      snippet: {
        id: result.insertedId.toString(),
        ...snippet,
      },
    });
  } catch (error: any) {
    console.error("Error creating code snippet:", error);
    return NextResponse.json(
      { error: "Failed to create code snippet" },
      { status: 500 }
    );
  }
}







