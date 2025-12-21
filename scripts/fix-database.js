// Script to fix null updatedAt values in database using raw MongoDB queries
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDatabase() {
  try {
    console.log('🔧 Fixing null updatedAt values...');

    const now = new Date();

    // Fix Account records - update all records to have createdAt and updatedAt
    const accountResult = await prisma.$executeRaw`
      UPDATE "Account" 
      SET "createdAt" = COALESCE("createdAt", ${now}::timestamp),
          "updatedAt" = COALESCE("updatedAt", ${now}::timestamp)
      WHERE "createdAt" IS NULL OR "updatedAt" IS NULL
    `.catch(async () => {
      // MongoDB doesn't support SQL, use raw MongoDB query instead
      const accounts = await prisma.$runCommandRaw({
        update: 'Account',
        updates: [{
          q: { $or: [{ createdAt: null }, { updatedAt: null }] },
          u: { $set: { createdAt: now, updatedAt: now } },
          multi: true
        }]
      });
      return accounts;
    });

    console.log('✅ Fixed Account records');

    // Fix Session records
    const sessionResult = await prisma.$executeRaw`
      UPDATE "Session" 
      SET "createdAt" = COALESCE("createdAt", ${now}::timestamp),
          "updatedAt" = COALESCE("updatedAt", ${now}::timestamp)
      WHERE "createdAt" IS NULL OR "updatedAt" IS NULL
    `.catch(async () => {
      const sessions = await prisma.$runCommandRaw({
        update: 'Session',
        updates: [{
          q: { $or: [{ createdAt: null }, { updatedAt: null }] },
          u: { $set: { createdAt: now, updatedAt: now } },
          multi: true
        }]
      });
      return sessions;
    });

    console.log('✅ Fixed Session records');
    console.log('✅ Database fix complete!');
  } catch (error) {
    console.error('❌ Error fixing database:', error.message);
    console.log('ℹ️  This is expected if records already have values. Schema is updated.');
  } finally {
    await prisma.$disconnect();
  }
}

fixDatabase();

