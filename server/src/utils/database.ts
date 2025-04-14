import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// MongoDB connection URI from environment variables
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nanomachine';

// Connect to MongoDB
export const connectToDatabase = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    // Don't exit the process, allow the application to continue
    // but log the error for debugging
  }
};

// Disconnect from MongoDB (useful for graceful shutdown)
export const disconnectFromDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error disconnecting from MongoDB:', error);
  }
};

// Export mongoose for use elsewhere
export default mongoose;
