// Script to fix date format issues in MongoDB
// Converts string dates to proper Date objects
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function fixDates() {
  let mongoClient;
  try {
    console.log('🔧 Fixing date format issues in MongoDB...');

    const mongoUrl = process.env.DATABASE_URL;
    if (!mongoUrl) {
      throw new Error('DATABASE_URL not found in .env');
    }

    mongoClient = new MongoClient(mongoUrl);
    await mongoClient.connect();
    const db = mongoClient.db();

    // Fix Account collection
    const accounts = await db.collection('Account').find({}).toArray();
    let accountFixed = 0;

    for (const account of accounts) {
      const updates = {};
      let needsUpdate = false;

      // Fix createdAt if it's a string
      if (account.createdAt && typeof account.createdAt === 'string') {
        updates.createdAt = new Date(account.createdAt);
        needsUpdate = true;
      } else if (!account.createdAt) {
        updates.createdAt = new Date();
        needsUpdate = true;
      }

      // Fix updatedAt if it's a string or null
      if (account.updatedAt && typeof account.updatedAt === 'string') {
        updates.updatedAt = new Date(account.updatedAt);
        needsUpdate = true;
      } else if (!account.updatedAt) {
        updates.updatedAt = new Date();
        needsUpdate = true;
      }

      if (needsUpdate) {
        await db.collection('Account').updateOne(
          { _id: account._id },
          { $set: updates }
        );
        accountFixed++;
      }
    }

    console.log(`✅ Fixed ${accountFixed} Account records`);

    // Fix Session collection
    const sessions = await db.collection('Session').find({}).toArray();
    let sessionFixed = 0;

    for (const session of sessions) {
      const updates = {};
      let needsUpdate = false;

      // Fix createdAt if it's a string
      if (session.createdAt && typeof session.createdAt === 'string') {
        updates.createdAt = new Date(session.createdAt);
        needsUpdate = true;
      } else if (!session.createdAt) {
        updates.createdAt = new Date();
        needsUpdate = true;
      }

      // Fix updatedAt if it's a string or null
      if (session.updatedAt && typeof session.updatedAt === 'string') {
        updates.updatedAt = new Date(session.updatedAt);
        needsUpdate = true;
      } else if (!session.updatedAt) {
        updates.updatedAt = new Date();
        needsUpdate = true;
      }

      // Fix expires if it's a string
      if (session.expires && typeof session.expires === 'string') {
        updates.expires = new Date(session.expires);
        needsUpdate = true;
      }

      if (needsUpdate) {
        await db.collection('Session').updateOne(
          { _id: session._id },
          { $set: updates }
        );
        sessionFixed++;
      }
    }

    console.log(`✅ Fixed ${sessionFixed} Session records`);
    console.log('✅ Date format fix complete!');
  } catch (error) {
    console.error('❌ Error fixing dates:', error.message);
    console.error(error);
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
  }
}

fixDates();







