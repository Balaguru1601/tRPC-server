import jwt from "jsonwebtoken";

const secrets = {
	auth: "somesecretkey",
};

export interface authTokenType {
	username: string;
	id: number;
}

export const extractToken = (token: string, type: keyof typeof secrets) => {
	return jwt.verify(token, secrets[type]);
};
