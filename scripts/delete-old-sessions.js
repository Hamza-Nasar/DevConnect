// Delete all old sessions to let them be recreated with proper date format
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function deleteOldSessions() {
  let mongoClient;
  try {
    console.log('🗑️  Deleting old sessions and accounts...');

    const mongoUrl = process.env.DATABASE_URL;
    if (!mongoUrl) {
      throw new Error('DATABASE_URL not found in .env');
    }

    mongoClient = new MongoClient(mongoUrl);
    await mongoClient.connect();
    const db = mongoClient.db();

    // Delete all sessions - they will be recreated on next login
    const sessionResult = await db.collection('Session').deleteMany({});
    console.log(`✅ Deleted ${sessionResult.deletedCount} Session records`);

    // Delete accounts with invalid dates
    const accountResult = await db.collection('Account').deleteMany({
      $or: [
        { createdAt: { $type: 'string' } },
        { updatedAt: { $type: 'string' } },
        { updatedAt: null },
        { createdAt: null }
      ]
    });
    console.log(`✅ Deleted ${accountResult.deletedCount} invalid Account records`);

    console.log('✅ Cleanup complete! Next login will create new records with proper date format.');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
  }
}

deleteOldSessions();







