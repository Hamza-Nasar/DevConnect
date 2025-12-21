// Script to fix null updatedAt values in MongoDB database
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function fixDatabase() {
  let mongoClient;
  try {
    console.log('🔧 Fixing null updatedAt values in MongoDB...');

    // Connect directly to MongoDB
    const mongoUrl = process.env.DATABASE_URL;
    if (!mongoUrl) {
      throw new Error('DATABASE_URL not found in .env');
    }

    mongoClient = new MongoClient(mongoUrl);
    await mongoClient.connect();
    const db = mongoClient.db();

    const now = new Date();

    // Fix ALL Account records - set createdAt and updatedAt if missing or null
    const allAccounts = await db.collection('Account').find({}).toArray();
    let accountFixed = 0;

    for (const account of allAccounts) {
      const needsUpdate = !account.createdAt || !account.updatedAt;
      if (needsUpdate) {
        await db.collection('Account').updateOne(
          { _id: account._id },
          {
            $set: {
              createdAt: account.createdAt || account.createdAt || now,
              updatedAt: account.updatedAt || account.updatedAt || now
            }
          }
        );
        accountFixed++;
      }
    }

    // Also update all accounts to ensure they have the fields
    const accountUpdateResult = await db.collection('Account').updateMany(
      {},
      {
        $set: {
          updatedAt: now
        },
        $setOnInsert: {
          createdAt: now
        }
      },
      { upsert: false }
    );

    console.log(`✅ Fixed ${accountFixed} Account records (manually)`);
    console.log(`✅ Updated ${accountUpdateResult.modifiedCount} Account records`);

    // Fix ALL Session records
    const allSessions = await db.collection('Session').find({}).toArray();
    let sessionFixed = 0;

    for (const session of allSessions) {
      const needsUpdate = !session.createdAt || !session.updatedAt;
      if (needsUpdate) {
        await db.collection('Session').updateOne(
          { _id: session._id },
          {
            $set: {
              createdAt: session.createdAt || session.createdAt || now,
              updatedAt: session.updatedAt || session.updatedAt || now
            }
          }
        );
        sessionFixed++;
      }
    }

    // Also update all sessions to ensure they have the fields
    const sessionUpdateResult = await db.collection('Session').updateMany(
      {},
      {
        $set: {
          updatedAt: now
        },
        $setOnInsert: {
          createdAt: now
        }
      },
      { upsert: false }
    );

    console.log(`✅ Fixed ${sessionFixed} Session records (manually)`);
    console.log(`✅ Updated ${sessionUpdateResult.modifiedCount} Session records`);
    console.log('✅ Database fix complete!');
  } catch (error) {
    console.error('❌ Error fixing database:', error.message);
    console.error(error);
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
  }
}

fixDatabase();
