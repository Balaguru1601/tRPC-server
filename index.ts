require("dotenv").config();
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { applyWSSHandler } from "@trpc/server/adapters/ws";
import cors from "cors";
import mongoose from "mongoose";
import { appRouter } from "./routes/AppRoutes";
import session from "express-session";
import { ContextType, createContext } from "./context";
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
		origin: "http://localhost:5173",
		allowedHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	})
);

mongoose
	.connect("mongodb://127.0.0.1:27017/ApiTesting")
	.then(() => {
		console.log("MONGO CONNECTION OPEN!!!");
	})
	.catch((err) => {
		console.log("OH NO MONGO ERROR!!!!");
		console.log(err);
	});

app.get("/hello", (req, res) => res.send("Hello"));

app.use(
	"/trpc",
	createExpressMiddleware({
		router: appRouter,
		createContext,
	})
);

const server = app.listen(8080);

applyWSSHandler({
	wss: new ws.Server({ server }),
	router: appRouter,
	createContext,
});
