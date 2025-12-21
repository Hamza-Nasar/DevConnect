// Aggressive cleanup - Delete ALL sessions and accounts to force fresh creation
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function cleanDatabase() {
  let mongoClient;
  try {
    console.log('🧹 Cleaning database - Deleting ALL sessions and accounts...');

    const mongoUrl = process.env.DATABASE_URL;
    if (!mongoUrl) {
      throw new Error('DATABASE_URL not found in .env');
    }

    mongoClient = new MongoClient(mongoUrl);
    await mongoClient.connect();
    const db = mongoClient.db();

    // Delete ALL sessions
    const sessionResult = await db.collection('Session').deleteMany({});
    console.log(`✅ Deleted ${sessionResult.deletedCount} Session records`);

    // Delete ALL accounts (they will be recreated on login)
    const accountResult = await db.collection('Account').deleteMany({});
    console.log(`✅ Deleted ${accountResult.deletedCount} Account records`);

    console.log('✅ Database cleaned! Next login will create fresh records with proper date format.');
    console.log('⚠️  Note: Users will need to log in again.');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
  }
}

cleanDatabase();







