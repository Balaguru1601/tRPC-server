import Redis from "ioredis";
require("dotenv").config();

export const redis = new Redis(process.env.REDIS_URL!);

// Example usage:

// Check if a user is online
// redis.sismember('users:online', userId, (err, isOnline) => {
//   if (err) {
//     // Handle error
//   } else {
//     console.log(`User ${userId} is ${isOnline ? 'online' : 'offline'}`);
//   }
// });

// Get all online users
