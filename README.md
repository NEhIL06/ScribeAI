# ScribeAI 🎙️

<div align="center">

![ScribeAI Banner](https://img.shields.io/badge/ScribeAI-AI--Powered%20Transcription-blue?style=for-the-badge)
[![Next.js](https://img.shields.io/badge/Next.js-14+-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Socket.io](https://img.shields.io/badge/Socket.io-Real--time-010101?style=flat-square&logo=socket.io)](https://socket.io/)
[![Gemini](https://img.shields.io/badge/Google-Gemini%20AI-4285F4?style=flat-square&logo=google)](https://ai.google.dev/)

**Real-time AI-powered meeting transcription with intelligent summaries**

[Features](#-features) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [API Docs](#-api-documentation) • [Demo](#-demo)

</div>

---

## 📖 About

ScribeAI transforms live conversations into searchable, actionable text. Capture audio from your microphone or browser tabs (Google Meet, Zoom), get real-time transcription powered by Google Gemini AI, and receive intelligent summaries with key decisions and action items.

**Perfect for:**
- 📊 Product managers tracking feature discussions
- 👥 Teams needing meeting documentation
- 📝 Researchers conducting interviews
- 🎓 Students recording lectures
- 💼 Consultants capturing client calls

---

## ✨ Features

### Core Capabilities

🎤 **Flexible Audio Input**
- Direct microphone recording
- Browser tab/screen audio capture (Google Meet, Zoom, etc.)
- High-quality WebM/Opus encoding

⚡ **Real-Time Transcription**
- Live speech-to-text with ~2-3 second latency
- Google Gemini AI processing
- WebSocket-based streaming for instant feedback

🧠 **Intelligent Summarization**
- Automatic extraction of key discussion points
- Decision tracking with context
- Action items with owner identification
- Risk and open question highlights

🎛️ **Session Management**
- Pause and resume recordings
- Session history and search
- Export capabilities
- State persistence (handles disconnections)

🔐 **Enterprise-Ready**
- Secure authentication (Better Auth)
- Session-based access control
- PostgreSQL data storage
- Privacy-focused (HttpOnly cookies)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ or Bun 1.0+
- PostgreSQL database
- Google Gemini API key ([get one free](https://ai.google.dev))

### Installation

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/ScribeAI.git
cd ScribeAI

# Install dependencies
bun install

# Setup database
cd apps/web/scribeai_frontend
npx prisma migrate dev
npx prisma generate
```

### Configuration

Create `.env` files in both frontend and backend:

**Frontend** (`apps/web/scribeai_frontend/.env`):
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/scribeai"
BETTER_AUTH_SECRET="your-secret-key"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_WS_URL="http://localhost:4000"
GOOGLE_GEMINI_API_KEY="your-api-key"
```

**WebSocket Server** (`apps/ws/.env`):
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/scribeai"
GOOGLE_GEMINI_API_KEY="your-api-key"
PORT=4000
```

### Run Locally

```bash
# Terminal 1 - Frontend
cd apps/web/scribeai_frontend
bun run dev

# Terminal 2 - WebSocket Server
cd apps/ws
bun run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## 🚀 Deployment

### Production Deployment Guide

ScribeAI is configured for easy deployment with **Vercel** (frontend) and **Render** (WebSocket server).

#### Prerequisites

1. **Database**: PostgreSQL instance (use [Supabase](https://supabase.com) free tier)
2. **Accounts**:
   - [Vercel](https://vercel.com) account (free)
   - [Render](https://render.com) account (free tier available)
3. **API Keys**: Google Gemini API key from [ai.google.dev](https://ai.google.dev)

---

### Step 1: Deploy Database (Supabase)

1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Copy **Connection Pooler** URL (not direct connection):
   ```
   postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true
   ```
4. Keep this handy for next steps

---

### Step 2: Deploy WebSocket Server (Render)

1. **Push code to GitHub** (if not already done)

2. **Go to [Render Dashboard](https://dashboard.render.com/)**

3. **Click "New +" → "Web Service"**

4. **Connect your GitHub repository**

5. **Configure the service:**
   - **Name**: `scribeai-ws-server`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: `apps/ws`
   - **Runtime**: `Node`
   - **Build Command**: 
     ```bash
     npm install && npx prisma generate
     ```
   - **Start Command**: 
     ```bash
     npm start
     ```

6. **Add Environment Variables:**
   ```bash
   DATABASE_URL=postgresql://... # Your Supabase connection string
   GOOGLE_GEMINI_API_KEY=your_gemini_api_key
   PORT=10000
   NODE_ENV=production
   ```

7. **Click "Create Web Service"**

8. **Wait for deployment** (~2-3 minutes)

9. **Copy your server URL**: `https://scribeai-ws-server.onrender.com`

---

### Step 3: Deploy Frontend (Vercel)

1. **Go to [Vercel Dashboard](https://vercel.com/dashboard)**

2. **Click "Add New..." → "Project"**

3. **Import your GitHub repository**

4. **Configure the project:**
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web/scribeai_frontend`
   - **Build Command**: 
     ```bash
     npm install && npx prisma generate && npm run build
     ```
   - **Output Directory**: `.next`

5. **Add Environment Variables:**
   ```bash
   # Database
   DATABASE_URL=postgresql://... # Your Supabase connection string
   
   # Better Auth
   BETTER_AUTH_SECRET=your-random-64-char-secret
   BETTER_AUTH_URL=https://your-app.vercel.app
   
   # WebSocket Server URL (from Render)
   NEXT_PUBLIC_WS_URL=https://scribeai-ws-server.onrender.com
   WS_URL=https://scribeai-ws-server.onrender.com
   
   # Google Gemini
   GOOGLE_GEMINI_API_KEY=your_gemini_api_key
   ```

6. **Click "Deploy"**

7. **Wait for deployment** (~2-3 minutes)

8. **Visit your app**: `https://your-app.vercel.app`

---

### Step 4: Run Database Migrations

After frontend is deployed:

1. In your **Vercel project settings** → **Settings** → **Functions**
2. Or run locally connected to production DB:
   ```bash
   DATABASE_URL="your-production-db-url" npx prisma migrate deploy
   ```

---

### Environment Variables Reference

**Frontend (Vercel):**
```bash
DATABASE_URL=postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true
BETTER_AUTH_SECRET=generate_with_openssl_rand_base64_64
BETTER_AUTH_URL=https://your-app.vercel.app
NEXT_PUBLIC_WS_URL=https://scribeai-ws-server.onrender.com
WS_URL=https://scribeai-ws-server.onrender.com
GOOGLE_GEMINI_API_KEY=your_api_key_here
```

**WebSocket Server (Render):**
```bash
DATABASE_URL=postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true
GOOGLE_GEMINI_API_KEY=your_api_key_here
PORT=10000
NODE_ENV=production
```

---

### Deployment Checklist

- [ ] Database created on Supabase
- [ ] WebSocket server deployed on Render
- [ ] Frontend deployed on Vercel
- [ ] All environment variables configured
- [ ] Database migrations run
- [ ] Test signup/login flow
- [ ] Test recording session end-to-end
- [ ] Verify WebSocket connection (check browser console)

---

### Troubleshooting

**Issue: "WebSocket connection failed"**
- Check CORS configuration in `apps/ws/src/index.ts`
- Update `origin` to include your Vercel domain:
  ```typescript
  cors: {
    origin: ["https://your-app.vercel.app", "http://localhost:3000"],
    methods: ["GET", "POST"]
  }
  ```

**Issue: "Database connection error"**
- Ensure you're using **Connection Pooler** URL from Supabase (port 6543)
- Add `?pgbouncer=true` to connection string
- Check Supabase project is not paused (free tier auto-pauses after 7 days inactivity)

**Issue: "Prisma Client not found"**
- Ensure `npx prisma generate` runs in build command
- Check build logs on Vercel/Render

**Issue: "Gemini API quota exceeded"**
  - Free tier: 60 requests/minute, 1500/day
- Upgrade to paid tier or implement rate limiting

---

### Monitoring Production

**Vercel:**
- View logs: Dashboard → Your Project → Deployments → View Logs
- Analytics: Dashboard → Your Project → Analytics

**Render:**
- View logs: Dashboard → Your Service → Logs tab
- Metrics: Dashboard → Your Service → Metrics tab

**Supabase:**
- Database usage: Dashboard → Your Project → Database
- Connection pooler stats: Dashboard → Settings → Database

---

## 🏗️ Architecture

### High-Level Overview

```mermaid
graph TB
    subgraph "Client Layer"
        A[Next.js Frontend<br/>React + TypeScript]
        B[MediaRecorder API<br/>15s Chunks]
    end
    
    subgraph "Transport Layer"
        C[Socket.io<br/>WebSocket Transport]
    end
    
    subgraph "Server Layer"
        D[Node.js WS Server<br/>Socket.io Handlers]
        E[Job Queue<br/>Async Processing]
        F[Worker Pool<br/>Concurrency Control]
    end
    
    subgraph "Data Layer"
        G[PostgreSQL<br/>Prisma ORM]
        H[File Storage<br/>Audio Chunks]
    end
    
    subgraph "AI Layer"
        I[Google Gemini<br/>Transcription]
        J[Google Gemini<br/>Summarization]
    end
    
    A --> B --> C
    C <--> D
    D --> E --> F
    F --> I & J
    F <--> G
    D <--> H
    I & J -.Results.-> F
    
    style I fill:#EA4335
    style J fill:#EA4335
    style A fill:#4F46E5
    style G fill:#3B82F6
```

### Data Flow

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant WSServer as WebSocket Server
    participant Queue
    participant Worker
    participant Gemini
    participant DB

    User->>Browser: Start Recording
    Browser->>Browser: Capture audio (15s chunks)
    
    loop Every 15 seconds
        Browser->>WSServer: Stream audio chunk
        WSServer->>Queue: Enqueue job
        WSServer->>DB: Store metadata
        WSServer-->>Browser: Acknowledge
        
        Queue->>Worker: Process chunk
        Worker->>Gemini: Transcribe audio
        Gemini-->>Worker: Return text
        Worker->>DB: Save transcript
        Worker->>WSServer: Broadcast update
        WSServer-->>Browser: Live transcript
    end
    
    User->>Browser: Stop Recording
    Browser->>WSServer: Finalize session
    WSServer->>Queue: Enqueue summary job
    Queue->>Worker: Generate summary
    Worker->>DB: Fetch all segments
    Worker->>Gemini: Summarize meeting
    Gemini-->>Worker: Structured summary
    Worker->>DB: Save summary
    Worker->>WSServer: Complete
    WSServer-->>Browser: Redirect to summary
```

For detailed scalability analysis and performance considerations, see [SCALABILITY.md](./SCALABILITY.md).

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14 + TypeScript | Server-side rendering, routing |
| **UI** | Tailwind CSS + shadcn/ui | Responsive design system |
| **State** | React Hooks + SWR | Client state + data fetching |
| **Real-time** | Socket.io Client | WebSocket communication |
| **Backend** | Node.js + Bun | WebSocket server runtime |
| **Database** | PostgreSQL + Prisma | Relational data storage |
| **Auth** | Better Auth | Session management |
| **AI** | Google Gemini 1.5 Flash | Transcription + summarization |
| **Audio** | MediaRecorder API | Browser audio capture |
| **Validation** | Zod | Runtime type checking |

---

## 📚 API Documentation

### REST Endpoints

**Base URL:** `http://localhost:3000/api/v1`

#### Create Session
```http
POST /sessions
Content-Type: application/json

{
  "title": "Team Standup"
}
```

**Response:**
```json
{
  "id": "session_123",
  "userId": "user_456",
  "title": "Team Standup",
  "state": "recording",
  "startedAt": "2024-11-25T06:00:00Z"
}
```

#### List Sessions
```http
GET /sessions
```

**Response:**
```json
[
  {
    "id": "session_123",
    "title": "Team Standup",
    "state": "completed",
    "startedAt": "2024-11-25T06:00:00Z",
    "stoppedAt": "2024-11-25T06:30:00Z",
    "summary": "Meeting focused on sprint planning..."
  }
]
```

#### Get Session Details
```http
GET /sessions/:id
```

**Response:**
```json
{
  "id": "session_123",
  "title": "Team Standup",
  "state": "completed",
  "summary": "### Executive Overview\n...",
  "segments": [
    {
      "seq": 0,
      "text": "Good morning team...",
      "startMs": 0,
      "isFinal": true
    }
  ]
}
```

### WebSocket Events

**Connect:** `ws://localhost:4000/record`

#### Client → Server

```typescript
// Join session room
socket.emit('joinSession', { sessionId: 'session_123' })

// Stream audio chunk
socket.emit('audioChunk', {
  sessionId: 'session_123',
  seq: 0,
  mime: 'audio/webm;codecs=opus',
  startMs: 0,
  durationMs: 15000
}, audioBuffer)

// Control recording
socket.emit('pauseSession', { sessionId: 'session_123' })
socket.emit('resumeSession', { sessionId: 'session_123' })
socket.emit('stopSession', { sessionId: 'session_123' })
```

#### Server → Client

```typescript
// Joined confirmation
socket.on('joined', (data) => {
  // { sessionId, state }
})

// Live transcript segment
socket.on('transcriptSegment', (data) => {
  // { sessionId, seq, text, speaker, isFinal }
})

// State changes
socket.on('stateChanged', (data) => {
  // { state: 'paused' | 'recording' | 'processing' | 'completed' }
})

// Summary ready
socket.on('completed', (data) => {
  // { sessionId, summary }
})
```

---

## 🎯 Key Design Decisions

### 1. **15-Second Audio Chunks**

**Why:** Balances latency (users see updates every 15s) with efficiency (avoids overwhelming Gemini API). For 1-hour sessions, this creates 240 chunks at ~500KB each.

**Alternative Considered:** 30s chunks (fewer API calls, higher latency).

### 2. **WebM Direct to Gemini**

**Why:** Gemini natively supports WebM/Opus. Eliminates FFmpeg transcoding step, reducing complexity and latency.

**Key Insight:** MediaRecorder must use stop/restart pattern to create complete WebM files (not fragments) to prevent AI hallucinations.

### 3. **Real-Time Streaming vs Batch Upload**

**Why:** Live transcription provides immediate value during meetings. Participants can reference what was said in real-time.

**Trade-off:** Higher complexity (WebSocket infrastructure) vs better UX for 30-60 min sessions.

See [detailed comparison table](./SCALABILITY.md#architecture-comparison) in scalability docs.

### 4. **Monorepo Architecture**

**Why:** Separate Next.js frontend and Node.js WebSocket server allows independent scaling and deployment.

**Benefit:** Can deploy frontend to Vercel, WebSocket server to Railway/Render with different resource allocations.

---

## 📂 Project Structure

```
ScribeAI/
├── apps/
│   ├── web/scribeai_frontend/    # Next.js application
│   │   ├── app/
│   │   │   ├── (auth)/            # Login/signup
│   │   │   ├── (protected)/       # Authenticated pages
│   │   │   │   ├── dashboard/     # Session list
│   │   │   │   └── session/       # Recording + summary
│   │   │   └── api/v1/            # REST endpoints
│   │   ├── components/            # React components
│   │   ├── hooks/                 # Custom hooks
│   │   ├── lib/                   # Utilities
│   │   └── prisma/                # Database schema
│   │
│   └── ws/                        # WebSocket server
│       └── src/
│           ├── sockets/           # Socket.io handlers
│           ├── workers/           # Job processor
│           ├── lib/               # Gemini integration
│           └── queue/             # Job queue
│
├── packages/ui/                   # Shared UI components
├── SCALABILITY.md                 # Performance analysis
└── README.md                      # This file
```

---

## 🎥 Demo

> **Live Demo:** [Watch on YouTube →](https://youtu.be/YOUR_VIDEO_ID)
>
> See ScribeAI in action:
> - Creating a session with tab audio capture
> - Real-time transcription during a Google Meet call
> - Pause/resume functionality
> - AI-generated meeting summary

---

## 🧪 Development

```bash
# Lint code
bun run lint

# Type check
bun run type-check

# Format code
bun run format

# Run tests
bun test
```

---

## 🚧 Roadmap

- [ ] **Export Formats** - PDF, DOCX, TXT transcripts
- [ ] **Multi-Speaker Diarization** - Identify and label speakers
- [ ] **Collaborative Sessions** - Multiple users viewing same live transcript
- [ ] **Bookmarks** - Mark important moments during recording
- [ ] **Search** - Full-text search across all sessions
- [ ] **Calendar Integration** - Auto-create sessions for meetings
- [ ] **Mobile Apps** - iOS and Android support
- [ ] **Webhooks** - Notify external systems on completion
- [ ] **API Keys** - Programmatic access
- [ ] **Team Workspaces** - Shared session libraries

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Nehil Chandrakar**  
[GitHub](https://github.com/YOUR_USERNAME) • [LinkedIn](https://linkedin.com/in/YOUR_PROFILE)

---

## 🙏 Acknowledgments

- [Google Gemini](https://ai.google.dev/) - AI transcription and summarization
- [Better Auth](https://better-auth.com/) - Authentication framework
- [Socket.io](https://socket.io/) - Real-time communication
- [Vercel](https://vercel.com/) - Next.js framework and hosting
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful UI components

---

<div align="center">

**Built with ❤️ using Next.js, TypeScript, and Google Gemini AI**

[⬆ Back to Top](#scribeai-)

</div>
