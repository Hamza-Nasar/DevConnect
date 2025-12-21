/**
 * Database Collections Separation Script
 * یہ script existing data کو proper collections میں separate کرتی ہے
 * 
 * Usage: node scripts/separate-collections.js
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const uri = process.env.DATABASE_URL;
const dbName = process.env.DATABASE_NAME || uri?.split('/').pop()?.split('?')[0] || 'devconnect';

if (!uri) {
  console.error('❌ DATABASE_URL is not set in .env.local');
  process.exit(1);
}

async function separateCollections() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(dbName);
    
    // Collections to ensure exist
    const collections = [
      'users',
      'accounts',
      'posts',
      'comments',
      'likedposts',
      'sharedposts',
      'follows',
      'notifications',
      'sessions',
      'stories',
      'polls',
      'pollvotes',
      'messages',
      'groups',
      'groupmembers',
      'groupposts',
      'usersettings',
      'profileviews',
      'devconnect', // Project metadata - collections list
    ];

    console.log('\n📋 Creating collections if they don\'t exist...');
    for (const collectionName of collections) {
      try {
        await db.createCollection(collectionName);
        console.log(`✅ Collection "${collectionName}" created`);
      } catch (error) {
        if (error.code === 48) {
          console.log(`ℹ️  Collection "${collectionName}" already exists`);
        } else {
          console.error(`❌ Error creating "${collectionName}":`, error.message);
        }
      }
    }

    // Separate accounts from users
    console.log('\n🔄 Separating accounts from users collection...');
    const usersCollection = db.collection('users');
    const accountsCollection = db.collection('accounts');
    
    // Find users with OAuth data that should be in accounts
    const usersWithOAuth = await usersCollection.find({
      $or: [
        { 'googleId': { $exists: true } },
        { 'provider': { $exists: true } },
        { 'providerAccountId': { $exists: true } },
      ]
    }).toArray();

    console.log(`Found ${usersWithOAuth.length} users with OAuth data`);

    for (const user of usersWithOAuth) {
      const userId = user._id.toString();
      
      // Check if account already exists
      const existingAccount = await accountsCollection.findOne({
        userId: userId,
        provider: user.provider || 'google',
      });

      if (!existingAccount) {
        // Create account document
        const accountData = {
          userId: userId,
          type: 'oauth',
          provider: user.provider || 'google',
          providerAccountId: user.providerAccountId || user.googleId || user.email,
          access_token: user.access_token || null,
          expires_at: user.expires_at || null,
          token_type: user.token_type || null,
          scope: user.scope || null,
          id_token: user.id_token || null,
          session_state: user.session_state || null,
          createdAt: user.createdAt || new Date(),
          updatedAt: new Date(),
        };

        await accountsCollection.insertOne(accountData);
        console.log(`✅ Created account for user: ${user.email || userId}`);

        // Remove OAuth fields from user document
        await usersCollection.updateOne(
          { _id: user._id },
          {
            $unset: {
              googleId: '',
              provider: '',
              providerAccountId: '',
              access_token: '',
              expires_at: '',
              token_type: '',
              scope: '',
              id_token: '',
              session_state: '',
            }
          }
        );
      }
    }

    // Create indexes for better performance
    console.log('\n📊 Creating indexes...');
    
    // Users indexes
    await usersCollection.createIndex({ email: 1 }, { unique: true, sparse: true });
    await usersCollection.createIndex({ username: 1 }, { unique: true, sparse: true });
    await usersCollection.createIndex({ phone: 1 }, { unique: true, sparse: true });
    console.log('✅ Users indexes created');

    // Accounts indexes
    await accountsCollection.createIndex({ userId: 1 });
    await accountsCollection.createIndex({ provider: 1, providerAccountId: 1 }, { unique: true });
    console.log('✅ Accounts indexes created');

    // Posts indexes
    const postsCollection = db.collection('posts');
    await postsCollection.createIndex({ userId: 1 });
    await postsCollection.createIndex({ createdAt: -1 });
    await postsCollection.createIndex({ hashtags: 1 });
    console.log('✅ Posts indexes created');

    // Comments indexes
    const commentsCollection = db.collection('comments');
    await commentsCollection.createIndex({ postId: 1 });
    await commentsCollection.createIndex({ userId: 1 });
    await commentsCollection.createIndex({ createdAt: -1 });
    console.log('✅ Comments indexes created');

    // Likes indexes
    const likesCollection = db.collection('likedposts');
    await likesCollection.createIndex({ userId: 1, postId: 1 }, { unique: true });
    await likesCollection.createIndex({ postId: 1 });
    console.log('✅ Likes indexes created');

    // Shares indexes
    const sharesCollection = db.collection('sharedposts');
    await sharesCollection.createIndex({ userId: 1, postId: 1 }, { unique: true });
    await sharesCollection.createIndex({ postId: 1 });
    console.log('✅ Shares indexes created');

    // Follows indexes
    const followsCollection = db.collection('follows');
    await followsCollection.createIndex({ followerId: 1, followingId: 1 }, { unique: true });
    await followsCollection.createIndex({ followerId: 1 });
    await followsCollection.createIndex({ followingId: 1 });
    console.log('✅ Follows indexes created');

    // Notifications indexes
    const notificationsCollection = db.collection('notifications');
    await notificationsCollection.createIndex({ userId: 1 });
    await notificationsCollection.createIndex({ userId: 1, read: 1 });
    await notificationsCollection.createIndex({ createdAt: -1 });
    console.log('✅ Notifications indexes created');

    // Messages indexes
    const messagesCollection = db.collection('messages');
    await messagesCollection.createIndex({ senderId: 1, receiverId: 1 });
    await messagesCollection.createIndex({ receiverId: 1, read: 1 });
    await messagesCollection.createIndex({ createdAt: -1 });
    console.log('✅ Messages indexes created');

    // Profile views indexes
    const profileViewsCollection = db.collection('profileviews');
    await profileViewsCollection.createIndex({ viewedId: 1 });
    await profileViewsCollection.createIndex({ viewerId: 1, viewedId: 1 });
    await profileViewsCollection.createIndex({ viewedAt: -1 });
    console.log('✅ Profile views indexes created');

    console.log('\n✅ Database collections separation completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Users: ${await usersCollection.countDocuments()}`);
    console.log(`   - Accounts: ${await accountsCollection.countDocuments()}`);
    console.log(`   - Posts: ${await postsCollection.countDocuments()}`);
    console.log(`   - Comments: ${await commentsCollection.countDocuments()}`);
    console.log(`   - Likes: ${await likesCollection.countDocuments()}`);
    console.log(`   - Shares: ${await sharesCollection.countDocuments()}`);
    console.log(`   - Follows: ${await followsCollection.countDocuments()}`);
    console.log(`   - Notifications: ${await notificationsCollection.countDocuments()}`);

    // Initialize devconnect metadata collection
    console.log('\n📊 Initializing devconnect metadata collection...');
    const devconnectCollection = db.collection('devconnect');
    
    // Get all collections with their counts
    const collectionsList = [];
    for (const collectionName of collections) {
      try {
        const coll = db.collection(collectionName);
        const count = await coll.countDocuments();
        const description = getCollectionDescription(collectionName);
        collectionsList.push({
          name: collectionName,
          description,
          count,
          lastUpdated: new Date(),
        });
      } catch (error) {
        const description = getCollectionDescription(collectionName);
        collectionsList.push({
          name: collectionName,
          description,
          count: 0,
          lastUpdated: new Date(),
        });
      }
    }

    // Save collections list
    await devconnectCollection.updateOne(
      { type: "collections_list" },
      {
        $set: {
          type: "collections_list",
          collections: collectionsList,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      },
      { upsert: true }
    );

    // Save project info
    await devconnectCollection.updateOne(
      { type: "project_info" },
      {
        $set: {
          type: "project_info",
          projectInfo: {
            name: "DevConnect",
            version: "1.0.0",
            description: "Developer social network platform",
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      },
      { upsert: true }
    );

    console.log('✅ DevConnect metadata collection initialized');
    console.log(`   - Total collections: ${collectionsList.length}`);
    console.log(`   - Collections list saved in devconnect collection`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✅ Database connection closed');
  }
}

// Helper function to get collection description
function getCollectionDescription(name) {
  const descriptions = {
    users: "User profiles and basic information",
    accounts: "OAuth accounts (Google, etc.) - separate collection",
    posts: "All posts",
    comments: "Comments on posts",
    likedposts: "Post likes",
    sharedposts: "Post shares",
    follows: "User follows",
    notifications: "User notifications",
    sessions: "User sessions",
    stories: "Stories",
    polls: "Polls",
    pollvotes: "Poll votes",
    messages: "Direct messages",
    groups: "Groups",
    groupmembers: "Group members",
    groupposts: "Group posts",
    usersettings: "User settings",
    profileviews: "Profile views",
    devconnect: "Project metadata - collections list",
  };
  return descriptions[name] || `${name} collection`;
}

// Run the script
separateCollections().catch(console.error);

