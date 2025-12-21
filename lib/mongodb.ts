import { MongoClient, Db } from "mongodb";

const uri = process.env.DATABASE_URL || '';

if (!uri) {
  console.warn('⚠️  DATABASE_URL is not set in environment variables');
  console.warn('⚠️  App will run but database features will not work');
  console.warn('⚠️  Add to .env.local: DATABASE_URL=mongodb://localhost:27017/devconnect');
}

const options = {
  serverSelectionTimeoutMS: 30000, // 30 seconds
  connectTimeoutMS: 30000, // 30 seconds
  socketTimeoutMS: 45000, // 45 seconds
  maxPoolSize: 10,
  minPoolSize: 1,
  maxIdleTimeMS: 30000,
  retryWrites: true,
  retryReads: true,
};

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    if (!uri) {
      console.error('⚠️  DATABASE_URL is not set. Please add it to .env.local');
      console.error('⚠️  Example: DATABASE_URL=mongodb://localhost:27017/devconnect');
      // Create a promise that will reject but won't crash immediately
      globalWithMongo._mongoClientPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('DATABASE_URL is required')), 0);
      });
    } else {
      client = new MongoClient(uri, {
        ...options,
        serverSelectionTimeoutMS: 30000, // 30 second timeout
        connectTimeoutMS: 30000,
        socketTimeoutMS: 45000,
      });
      globalWithMongo._mongoClientPromise = client.connect().catch((err) => {
        console.error('❌ MongoDB connection error:', err.message);
        console.error('⚠️  Make sure MongoDB is running and DATABASE_URL is correct');
        console.error('⚠️  App will continue but database features will not work');
        // Return a mock client that will fail gracefully
        return Promise.reject(err);
      });
    }
  }
  clientPromise = globalWithMongo._mongoClientPromise;
  } else {
    // In production mode, it's best to not use a global variable.
    if (!uri) {
      console.warn('⚠️  DATABASE_URL not set in production - MongoDB features disabled');
      // Create a promise that will reject but won't crash immediately
      // Use a longer delay to allow app initialization
      clientPromise = new Promise((resolve, reject) => {
        setTimeout(() => {
          const error = new Error('DATABASE_URL is required');
          console.warn('⚠️  MongoDB connection will fail:', error.message);
          reject(error);
        }, 2000);
      });
      
      // Handle the rejection to prevent unhandled promise rejection
      clientPromise.catch((err) => {
        console.warn('⚠️  MongoDB not available - app will continue without database features');
      });
    } else {
    client = new MongoClient(uri, options);
    clientPromise = client.connect().catch((err) => {
      console.error('❌ MongoDB connection error:', err.message);
      console.warn('⚠️  App will continue but database features will not work');
      return Promise.reject(err);
    });
  }
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
// This will reject if DATABASE_URL is not set, but NextAuth adapter should handle this gracefully
export default clientPromise;

// Helper function to get database
export async function getDb(): Promise<Db> {
  if (!clientPromise) {
    throw new Error('MongoDB not configured. Please set DATABASE_URL in .env.local');
  }
  const client = await clientPromise;
  const dbName = process.env.DATABASE_NAME || uri.split('/').pop()?.split('?')[0] || 'devconnect';
  return client.db(dbName);
}

// Helper function to get collections
export async function getCollection(collectionName: string) {
  if (!clientPromise) {
    throw new Error('MongoDB not configured. Please set DATABASE_URL in .env.local');
  }
  const db = await getDb();
  return db.collection(collectionName);
}

