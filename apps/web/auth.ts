import { auth } from "better-auth";
import { prisma } from "../../packages/database/src";

export const { 
  signIn,
  signUp,
  signOut,
  getUser,
  createSession,
  verifyAuthToken
} = auth({
  database: {
    type: "prisma",
    client: prisma
  },
  jwt: {
    secret: process.env.AUTH_SECRET!,  // long random key
  },
  providers: [
    {
      id: "email",
      type: "email"
    }
  ]
});
