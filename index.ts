require("dotenv").config();
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { applyWSSHandler } from "@trpc/server/adapters/ws";
import cors from "cors";
import { appRouter } from "./routes/AppRoutes";
import session from "express-session";
import { createContext } from "./context";
import cookieParser from "cookie-parser";
import ws from "ws";
import { addSocketId, clearOnlineUsers, redis, removeSocketId, removeUser } from "./redis";
import { PrismaClient } from "@prisma/client";
import { io, ioServer } from "./socket";

declare module "express-session" {
	export interface SessionData {
		user: {
			id: string;
			username: string;
		};
	}
}

const app = express();

export const prisma = new PrismaClient();

app.use(express.json());
app.use(cookieParser());
app.set("trust proxy", 1); // trust first proxy
app.use(
	session({
		secret: "somesecretmessage",
		resave: false,
		saveUninitialized: false,
	})
);
app.use(
	cors({
		origin: ["http://localhost:5173", "http://localhost:3000"],
		allowedHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	})
);

app.get("/hello", (req, res) => res.send("Hello"));

app.use(
	"/trpc",
	createExpressMiddleware({
		router: appRouter,
		createContext,
	})
);

// const wsServer = app.listen(8081, () => console.log("ws server initialzed!"));
const server = app.listen(8080, () => console.log("listening at 8080"));

ioServer.listen(8081, () => console.log("socket server initialzed!"));

const wss = new ws.WebSocketServer({ server });

wss.on("connection", (ws) => {
	console.log(`➕➕ Connection (${wss.clients.size})`);
	ws.once("close", () => {
		console.log(`➖➖ Connection (${wss.clients.size})`);
	});
});

const handler = applyWSSHandler({
	wss,
	router: appRouter,
	createContext,
});

process.on("SIGTERM", () => {
	clearOnlineUsers()
		.then(() => {
			handler.broadcastReconnectNotification();
			wss.close();
			redis.quit();
			server.close();
		})
		.finally(() => {
			console.log("finally");
			process.exit(0);
		});
});

process.on("SIGINT", () => {
	clearOnlineUsers()
		.then(() => {
			handler.broadcastReconnectNotification();
			wss.close();
			redis.quit();
			server.close();
		})
		.finally(() => {
			console.log("finally");
			process.exit(0);
		});
});

process.on("warning", (e) => console.warn(e.stack));

// process.on("beforeExit", async () => await clearOnlineUsers());
// process.on("SIGINT",);
