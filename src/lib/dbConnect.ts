import connectDB from './mongodb';

/**
 * Wrapper function to connect to the MongoDB database
 * Uses the existing MongoDB connection utility
 */
export default async function dbConnect() {
  return await connectDB();
} 