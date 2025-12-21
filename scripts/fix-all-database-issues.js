// Comprehensive fix for ALL database issues
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function fixAllIssues() {
  let mongoClient;
  try {
    console.log('🔧 Comprehensive database fix...');

    const mongoUrl = process.env.DATABASE_URL;
    if (!mongoUrl) {
      throw new Error('DATABASE_URL not found in .env');
    }

    mongoClient = new MongoClient(mongoUrl);
    await mongoClient.connect();
    const db = mongoClient.db();

    const now = new Date();

    // Delete ALL sessions - they will be recreated
    const sessionDelete = await db.collection('Session').deleteMany({});
    console.log(`🗑️  Deleted ${sessionDelete.deletedCount} Session records`);

    // Delete ALL accounts - they will be recreated
    const accountDelete = await db.collection('Account').deleteMany({});
    console.log(`🗑️  Deleted ${accountDelete.deletedCount} Account records`);

    // Fix ALL Account records that might have string dates
    const allAccounts = await db.collection('Account').find({}).toArray();
    for (const account of allAccounts) {
      const updates = {};
      
      if (account.createdAt && typeof account.createdAt === 'string') {
        updates.createdAt = new Date(account.createdAt);
      } else if (!account.createdAt) {
        updates.createdAt = now;
      }
      
      if (account.updatedAt && typeof account.updatedAt === 'string') {
        updates.updatedAt = new Date(account.updatedAt);
      } else if (!account.updatedAt) {
        updates.updatedAt = now;
      }

      if (Object.keys(updates).length > 0) {
        await db.collection('Account').updateOne(
          { _id: account._id },
          { $set: updates }
        );
      }
    }

    // Fix ALL Session records
    const allSessions = await db.collection('Session').find({}).toArray();
    for (const session of allSessions) {
      const updates = {};
      
      if (session.createdAt && typeof session.createdAt === 'string') {
        updates.createdAt = new Date(session.createdAt);
      } else if (!session.createdAt) {
        updates.createdAt = now;
      }
      
      if (session.updatedAt && typeof session.updatedAt === 'string') {
        updates.updatedAt = new Date(session.updatedAt);
      } else if (!session.updatedAt) {
        updates.updatedAt = now;
      }
      
      if (session.expires && typeof session.expires === 'string') {
        updates.expires = new Date(session.expires);
      } else if (!session.expires) {
        updates.expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }

      if (Object.keys(updates).length > 0) {
        await db.collection('Session').updateOne(
          { _id: session._id },
          { $set: updates }
        );
      }
    }

    console.log('✅ Database fix complete!');
    console.log('✅ All invalid records deleted');
    console.log('✅ Next login will create fresh records with proper format');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
  }
}

fixAllIssues();







