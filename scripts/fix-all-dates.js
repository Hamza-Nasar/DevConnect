// Comprehensive script to fix ALL date issues in MongoDB
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function fixAllDates() {
  let mongoClient;
  try {
    console.log('🔧 Fixing ALL date format issues in MongoDB...');

    const mongoUrl = process.env.DATABASE_URL;
    if (!mongoUrl) {
      throw new Error('DATABASE_URL not found in .env');
    }

    mongoClient = new MongoClient(mongoUrl);
    await mongoClient.connect();
    const db = mongoClient.db();

    const now = new Date();

    // Fix Account collection - Update ALL records
    const allAccounts = await db.collection('Account').find({}).toArray();
    let accountFixed = 0;

    for (const account of allAccounts) {
      const updates = {};
      
      // Always set createdAt and updatedAt to proper Date objects
      if (!account.createdAt || typeof account.createdAt === 'string') {
        updates.createdAt = account.createdAt ? new Date(account.createdAt) : now;
      }
      if (!account.updatedAt || typeof account.updatedAt === 'string') {
        updates.updatedAt = account.updatedAt ? new Date(account.updatedAt) : now;
      }

      if (Object.keys(updates).length > 0) {
        await db.collection('Account').updateOne(
          { _id: account._id },
          { $set: updates }
        );
        accountFixed++;
      }
    }

    console.log(`✅ Fixed ${accountFixed} Account records`);

    // Fix Session collection - Update ALL records
    const allSessions = await db.collection('Session').find({}).toArray();
    let sessionFixed = 0;

    for (const session of allSessions) {
      const updates = {};
      
      // Fix createdAt
      if (!session.createdAt || typeof session.createdAt === 'string') {
        updates.createdAt = session.createdAt ? new Date(session.createdAt) : now;
      }
      
      // Fix updatedAt
      if (!session.updatedAt || typeof session.updatedAt === 'string') {
        updates.updatedAt = session.updatedAt ? new Date(session.updatedAt) : now;
      }
      
      // Fix expires
      if (!session.expires || typeof session.expires === 'string') {
        updates.expires = session.expires ? new Date(session.expires) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      }

      if (Object.keys(updates).length > 0) {
        await db.collection('Session').updateOne(
          { _id: session._id },
          { $set: updates }
        );
        sessionFixed++;
      }
    }

    console.log(`✅ Fixed ${sessionFixed} Session records`);

    // Also delete old/invalid sessions to let them be recreated
    const deleteResult = await db.collection('Session').deleteMany({
      $or: [
        { createdAt: { $type: 'string' } },
        { updatedAt: { $type: 'string' } },
        { expires: { $type: 'string' } }
      ]
    });
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} invalid Session records (will be recreated on next login)`);

    console.log('✅ All date format fixes complete!');
  } catch (error) {
    console.error('❌ Error fixing dates:', error.message);
    console.error(error);
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
  }
}

fixAllDates();







