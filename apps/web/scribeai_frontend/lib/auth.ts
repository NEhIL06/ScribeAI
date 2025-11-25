import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import prisma from '@/lib/prisma'

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: [
    "https://scribe-ai-ws.vercel.app",
    "https://*.vercel.app", // Allow all Vercel preview deployments
    "http://localhost:3000" // Local development
  ],
})