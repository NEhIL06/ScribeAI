# Deployment Guide for ScribeAI

This document provides quick reference for deploying ScribeAI to production.

## Quick Deploy Commands

### Render (WebSocket Server)

```bash
# Build command
npm install && npx prisma generate

# Start command  
npm start
```

### Vercel (Frontend)

```bash
# Build command
npm install && npx prisma generate && npm run build
```

## Environment Variables

Copy these into your deployment platform:

### Render
```
DATABASE_URL=<your-supabase-pooler-url>
GOOGLE_GEMINI_API_KEY=<your-api-key>
PORT=10000
NODE_ENV=production
```

### Vercel
```
DATABASE_URL=<your-supabase-pooler-url>
BETTER_AUTH_SECRET=<generate-random-64-chars>
BETTER_AUTH_URL=https://your-app.vercel.app
NEXT_PUBLIC_WS_URL=https://scribeai-ws-server.onrender.com
WS_URL=https://scribeai-ws-server.onrender.com
GOOGLE_GEMINI_API_KEY=<your-api-key>
```

## Post-Deployment

1. Update CORS in `apps/ws/src/index.ts`:
   ```typescript
   origin: ["https://your-app.vercel.app"]
   ```

2. Run migrations:
   ```bash
   DATABASE_URL="<production-url>" npx prisma migrate deploy
   ```

3. Test the deployment:
   - Sign up for account
   - Create recording session
   - Verify live transcription works
   - Check summary generation

See full deployment guide in [README.md](./README.md#deployment).
