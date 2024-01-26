import Redis from "ioredis";
require("dotenv").config();

export const redis = new Redis(process.env.REDIS_URL!);

// Listen to 'error' events to the Redis connection
redis.on("error", (error: any) => {
	if (error.code && error.code === "ECONNRESET") {
		console.log("Connection to Redis Session Store timed out.");
	} else if (error.code && error.code === "ECONNREFUSED") {
		console.log("Connection to Redis Session Store refused!");
	} else console.log(error);
});

// Listen to 'reconnecting' event to Redis
redis.on("reconnecting", (err: any) => {
	if (redis.status === "reconnecting") console.log("Reconnecting to Redis Session Store...");
	else console.log("Error reconnecting to Redis Session Store.");
});

// Listen to the 'connect' event to Redis
redis.on("connect", (err: any) => {
	if (!err) console.log("Connected to Redis Session Store!");
});
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
