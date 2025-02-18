import mongoose from 'mongoose';

// Define an interface for our mongoose connection cache
interface MongooseCache {
  conn: mongoose.Mongoose | null;
  promise: Promise<mongoose.Mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

// Ensure the global variable is defined
globalThis.mongooseCache = globalThis.mongooseCache ?? { conn: null, promise: null };
const cached = globalThis.mongooseCache;

async function connectDB() {
  if (cached.conn) {
    console.log("MongoDB: Already connected");
    return cached.conn;
  }

  if (!cached.promise) {
    console.log("MongoDB: No existing connection promise, connecting now...");
    const opts = { 
      bufferCommands: false,
      // Optionally add a connection timeout
      connectTimeoutMS: 10000
    };
    cached.promise = mongoose.connect(MONGODB_URI, opts);
  }

  // Add a timer to log if connection takes too long
  const start = Date.now();

  try {
    cached.conn = await cached.promise;
    const duration = Date.now() - start;
    console.log(`MongoDB: Connection established successfully on host: ${cached.conn.connection.host} (took ${duration}ms)`);
  } catch (e) {
    console.error("MongoDB: Connection error:", e);
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB; 