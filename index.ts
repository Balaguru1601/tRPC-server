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

declare module "express-session" {
	export interface SessionData {
		user: {
			id: string;
			username: string;
		};
	}
}

const app = express();

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

const server = app.listen(8080, () => console.log("listening at 8080"));

const wss = new ws.WebSocketServer({ server });

wss.on("connection", () => {
	console.log("-- ws connection established --", wss.clients.size);
});

wss.on("close", () => {
	console.log("-- ws connection closed --", wss.clients.size);
	wss.close();
});

const handler = applyWSSHandler({
	wss,
	router: appRouter,
	createContext,
});

process.on("SIGTERM", () => {
	console.log("SIGTERM");

	handler.broadcastReconnectNotification();

	wss.close();
});

process.on("warning", (e) => console.warn(e.stack));
