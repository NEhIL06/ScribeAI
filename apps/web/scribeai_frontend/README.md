# ScribeAI - Real-time Audio Transcription Platform

ScribeAI is a professional full-stack application for real-time audio transcription, featuring live streaming, AI-powered summaries, and session management. Built with Next.js 14+, TypeScript, and WebSocket technology.

## 🚀 Features

- **Real-time Transcription**: Live audio streaming via WebSocket with instant text feedback
- **Dual Audio Sources**: Support for microphone input and system audio (tab sharing)
- **Session Management**: Dashboard to organize, view, and export recording sessions
- **AI Summaries**: Automated executive summaries, action items, and key decisions
- **Robust State Management**: XState-powered session lifecycle handling
- **Secure Authentication**: Email/password login with BetterAuth
- **Responsive Design**: Mobile-first UI with dark mode support

## 🛠 Tech Stack

- **Frontend**: Next.js 14 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS, Shadcn UI, Lucide Icons
- **State Management**: XState (Session Machine), SWR (Data Fetching)
- **Real-time**: Socket.io Client, MediaRecorder API
- **Validation**: Zod
- **Auth**: BetterAuth

## 🏗 Architecture

### Audio Streaming Pipeline

\`\`\`mermaid
sequenceDiagram
    participant Client as Browser (MediaRecorder)
    participant Socket as WebSocket Client
    participant Server as Backend Server
    participant AI as Transcription Service

    Client->>Socket: Join Session
    Socket->>Server: joinSession(sessionId)
    Server-->>Socket: joined
    
    Client->>Client: Capture Audio Chunk (1s)
    Client->>Socket: audioChunk(meta, buffer)
    Socket->>Server: Forward Audio
    Server->>AI: Stream Audio
    
    AI-->>Server: Transcript Segment
    Server-->>Socket: transcriptSegment
    Socket-->>Client: Update UI
\`\`\`

### Session State Machine

The application uses a finite state machine to manage the complex session lifecycle:

- **Idle**: Initial state, waiting to join session
- **Ready**: Session joined, ready to record
- **Recording**: Actively capturing and streaming audio
- **Paused**: Recording temporarily suspended
- **Processing**: Audio stopped, waiting for final processing
- **Completed**: Session finished, summary available
- **Error**: System encountered a recoverable error

## 📦 Installation

1. **Clone the repository**
   \`\`\`bash
   git clone https://github.com/yourusername/scribeai-web.git
   cd scribeai-web
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   # or
   pnpm install
   \`\`\`

3. **Configure environment variables**
   Create a `.env.local` file:
   \`\`\`env
   NEXT_PUBLIC_API_URL=http://localhost:3001
   NEXT_PUBLIC_WS_URL=ws://localhost:3001
   \`\`\`

4. **Run development server**
   \`\`\`bash
   npm run dev
   \`\`\`

## 🚀 Deployment

The application is optimized for deployment on Vercel:

1. Push your code to GitHub
2. Import the project in Vercel
3. Add the environment variables (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`)
4. Click **Deploy**

## 📊 MediaRecorder vs WebRTC

For this application, we chose **MediaRecorder over WebRTC** for the following reasons:

| Feature | MediaRecorder + WebSocket | WebRTC |
|---------|---------------------------|--------|
| **Complexity** | Low - Simple chunk-based streaming | High - Requires signaling, ICE, STUN/TURN |
| **Latency** | Low (~1s chunks) | Ultra Low (<500ms) |
| **Reliability** | High - TCP guarantees delivery | Variable - UDP can drop packets |
| **Server Load** | Moderate - WebSocket connections | High - Media processing/forwarding |
| **Browser Support** | Excellent | Good, but complex edge cases |

**Why MediaRecorder?**
For transcription, 100% audio packet delivery is more critical than sub-second latency. WebRTC (UDP) can drop packets in poor network conditions, leading to missing words. WebSocket (TCP) ensures all audio chunks arrive in order, guaranteeing complete transcripts even if slightly delayed.

## 📈 Scalability for Long Sessions

Handling long recording sessions (1h+) requires careful memory and connection management:

1. **Chunked Streaming**: We stream small 1-second chunks rather than buffering large files, keeping client memory usage constant regardless of session length.
2. **Reconnection Logic**: The Socket.io client automatically handles reconnection with exponential backoff, ensuring sessions survive temporary network drops.
3. **State Recovery**: The XState machine persists state and can recover the correct UI state (Recording/Paused) upon page reload or reconnection.
4. **Virtual Scrolling**: The transcript view uses virtualization (via `ScrollArea` and efficient DOM updates) to render thousands of segments without performance degradation.

## 📝 License

MIT
