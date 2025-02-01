import Redis from "ioredis";
require("dotenv").config();

export const redis = new Redis(process.env.REDIS_URL!);

export const onlineUsersKey = "users:online";
const socketKey = "users:socketid";

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

export async function addUser(userId: number) {
	console.log("add user");
	const expiry = Date.now() + 3600000; // 1 hour in milliseconds
	await redis.zadd(onlineUsersKey, expiry, userId);
}

export async function addSocketId(userId: number, socketid: string) {
	await redis.hset(socketKey, userId, socketid);
}

export async function getSocketId(userId: number) {
	const id = await redis.hget(socketKey, userId.toString());
	return id;
}

export async function removeSocketId(userId: number) {
	await redis.hdel(socketKey, userId.toString());
}

// addUser(1);
// addUser(2);

export async function removeExpiredUsers() {
	const now = Date.now();
	const removed = await redis.zremrangebyscore(onlineUsersKey, "-inf", now);
	// Handle removed users, e.g., log or notify
}

export async function getOnlineUsers() {
	try {
		const onlineUserIds = await redis.zrangebyscore(onlineUsersKey, 0, "+inf");
		// Optionally fetch user details from another data store based on IDs
		return onlineUserIds;
	} catch (error) {
		console.log("error ->", error);
		return [];
	}
}

export async function isUserOnline(userId: number) {
	const expiry = await redis.zscore(onlineUsersKey, userId);
	return expiry && +expiry > Date.now();
}

export async function removeUser(userId: number) {
	try {
		await redis.zrem(onlineUsersKey, userId);
	} catch (error) {
		console.log(error);
	}
}

export async function clearOnlineUsers() {
	try {
		await redis.zremrangebyscore(onlineUsersKey, "-inf", "+inf");
		console.log("cleared online users");
	} catch (error) {
		console.log(error);
	}
}

export async function checkAndResetUser(userId: number) {
	// const now = Date.now();

	// const multi = redis.multi();

	// multi.zscore(onlineUsersKey, userId);
	// multi.zadd(onlineUsersKey,newExpiry , userId, { NX: true }); // Pass NX as an option object

	// const [score, added] = await multi.exec();

	const now = Date.now();
	const newExpiry = now + 3600000;

	const multi = redis.multi();

	// 1. Check expiry using ZSCORE with pipelining for efficiency
	multi.zscore(onlineUsersKey, userId);

	// 2. Add user with new expiry if not already online or expired
	multi.zadd(onlineUsersKey, "NX", newExpiry, userId);

	// 3. Execute both commands atomically
	const res = await multi.exec();

	// if (res && res[0] && +res[0] <= now) {
	// 	console.log(`User ${userId} was expired, added again with new expiry.`);
	// } else if (res && +res[1] !==0) {
	// 	console.log(res[1]);
	// 	console.log(`User ${userId} added as a new online user.`);
	// } else {
	// 	console.log(`User ${userId} is already online.`);
	// }

	// ... (rest of the code remains the same)
}
