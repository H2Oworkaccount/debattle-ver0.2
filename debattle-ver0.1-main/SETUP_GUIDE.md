# Quick Start Guide

## Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)
- PostgreSQL 15+ (for local development)
- **Groq API Key** (free tier available at https://console.groq.com)
- **Google OAuth Credentials** (optional, for easy authentication)

## Quick Setup with Docker (Recommended)

### 1. Clone and Navigate

```bash
cd debattle-ver0.1
```

### 2. Set Environment Variables

Create `.env` in the project root:

```bash
# Server Configuration
PORT=4000
NODE_ENV=development

# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=debattle
DB_USER=debattle_user
DB_PASSWORD=debattle_password

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# Google OAuth (Optional - for easy sign-in)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Groq API (Free tier available!)
GROQ_API_KEY=your_groq_api_key_here

# CORS Configuration
FRONTEND_URL=http://localhost:3000
```

### 3. Google OAuth Setup (Optional but Recommended)

**Why Google OAuth?** Skip username/password registration - just click "Continue with Google"!

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Set application type to "Web application"
6. Add authorized redirect URIs:
   - `http://localhost:4000/api/auth/google/callback` (for development)
   - `https://yourdomain.com/api/auth/google/callback` (for production)
7. Copy Client ID and Client Secret to your `.env` file

### 4. Start with Docker Compose

```bash
docker-compose up --build
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- Database: localhost:5432

## Local Development Setup

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env

# Edit .env with your local database settings
# Set ANTHROPIC_API_KEY

# If using local PostgreSQL, run:
npm run db:init

# Start backend
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install

# Start frontend
npm start
```

## Architecture Overview

### Backend
- **Server**: Express.js + Socket.IO for real-time communication
- **Database**: PostgreSQL for persistent data
- **WebSocket Events**: Debate room management, WebRTC signaling
- **AI Integration**: Anthropic Claude for debate analysis

### Frontend
- **UI Framework**: React 18
- **Real-time**: Socket.IO client
- **Video/Audio**: WebRTC via Simple-Peer library
- **Routing**: React Router v6

### Key Features

1. **User Authentication**
   - Register with username/email/password
   - JWT token-based sessions
   - Secure password hashing with bcryptjs

2. **Debate System**
   - Real-time matchmaking queue
   - WebRTC video/audio communication
   - Random topic assignment (Pro/Con sides)
   - Real-time transcript tracking

3. **AI Analysis**
   - Claude analyzes debate arguments
   - Scores both participants (0-100)
   - Identifies strengths/weaknesses
   - Determines winner

4. **Ranking System**
   - Tracks wins/losses
   - Rating system (like ELO)
   - Win rate calculation
   - Global leaderboard

# Quick Start Guide

## Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)
- PostgreSQL 15+ (for local development)
- **Groq API Key** (FREE! Get from https://console.groq.com)

## Quick Setup with Docker (Recommended)

### 1. Clone and Navigate

```bash
cd debattle-ver0.1
```

### 2. Get Groq API Key (FREE)

1. Visit https://console.groq.com
2. Sign up (takes 2 minutes)
3. Get your API key
4. Copy and save it (you'll need it next)

### 3. Set Environment Variables

Create a `.env` file in the project root OR in `backend/.env`:

```bash
# Backend .env
PORT=4000
NODE_ENV=development
DB_HOST=postgres
DB_PORT=5432
DB_NAME=debattle
DB_USER=debattle_user
DB_PASSWORD=debattle_password
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
GROQ_API_KEY=your_groq_api_key_here
FRONTEND_URL=http://localhost:3000
TTS_ENABLED=true
```

### 4. Start with Docker Compose

```bash
docker-compose up
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:4000
- **Database**: localhost:5432

## Local Development Setup

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env

# Edit .env with your settings
# Set GROQ_API_KEY to your Groq API key

# If using local PostgreSQL, run:
npm run db:init

# Start backend
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install

# Start frontend
npm start
```

## Architecture Overview

### Backend
- **Server**: Express.js + Socket.IO for real-time communication
- **Database**: PostgreSQL for persistent data
- **WebSocket Events**: Debate room management, WebRTC signaling
- **AI Integration**: Groq's Mixtral 8x7B model for debate analysis
- **TTS**: Browser Web Speech API for audio narration

### Frontend
- **UI Framework**: React 18
- **Real-time**: Socket.IO client
- **Video/Audio**: WebRTC via Simple-Peer library
- **Routing**: React Router v6
- **Spectating**: Real-time debate streaming with Web Speech TTS

### Key Features

1. **User Authentication**
   - Register with username/email/password
   - JWT token-based sessions
   - Secure password hashing with bcryptjs

2. **Debate System**
   - Real-time matchmaking queue
   - WebRTC video/audio communication
   - Random topic assignment (Pro/Con sides)
   - Structured debate timing:
     * 30s: Pro initial arguments
     * 30s: Con initial arguments
     * 25s: Intermission (AI analysis + initial scoring)
     * 15s: Pro final rebuttal
     * 15s: Con final rebuttal
   - Real-time transcript tracking

3. **AI Analysis (Groq)**
   - Analyzes arguments during intermission
   - Provides initial scores
   - Final comprehensive analysis after debate
   - No API costs (Groq free tier!)

4. **Spectator Mode**
   - Debaters can enable spectators
   - Generate 6-character spectator codes
   - Share codes with streamers/viewers
   - Real-time streaming of debates
   - Live transcript visible to spectators
   - AI analysis narration via Web Speech API

5. **Ranking System**
   - Tracks wins/losses
   - Rating system (like ELO)
   - Win rate calculation
   - Global leaderboard

6. **Text-to-Speech**
   - Listen to AI analysis instead of reading
   - Browser native Web Speech API
   - Works for all AI analysis sections

## Database Schema

### Tables
- `users` - User accounts
- `user_stats` - Rankings and statistics
- `debates` - Debate history with results
- `debate_topics` - Pool of debate topics
- `spectator_codes` - Spectator access codes
- `spectators` - Spectator session tracking

See `backend/db/schema.sql` for full schema.

## API Documentation

See `backend/README.md` for detailed API and WebSocket event documentation.

## Frontend Structure

```
frontend/
├── src/
│   ├── pages/
│   │   ├── AuthPage.jsx      - Login/Register
│   │   ├── Dashboard.jsx     - Main hub
│   │   ├── Debate.jsx        - Active debate
│   │   ├── Leaderboard.jsx   - Rankings
│   │   └── Spectator.jsx     - Spectator mode
│   ├── components/          - Reusable components
│   ├── hooks/
│   │   └── useSocket.js     - WebSocket hook
│   ├── context/
│   │   ├── AuthContext.jsx  - Auth state
│   │   └── PrivateRoute.jsx - Route protection
│   └── App.jsx              - Main app
```

## Debate Flow

1. User logs in/registers
2. Clicks "Find Opponent"
3. Gets matched with another user
4. Assigned random topic (Pro or Con side)
5. See opponent via webcam, hear via microphone
6. **Phase 1 (30s)**: Pro presents initial argument
7. **Phase 2 (30s)**: Con presents initial argument
8. **Phase 3 (25s)**: Intermission
   - AI analyzes initial arguments
   - Initial scores displayed
   - AI narrates analysis via TTS
9. **Phase 4 (15s)**: Pro delivers final rebuttal
10. **Phase 5 (15s)**: Con delivers final rebuttal
11. AI provides final analysis and determines winner
12. Stats updated, user moves up/down leaderboard

## Spectator Flow

1. Debater clicks "Enable Spectators" button
2. Receives 6-character spectator code
3. Shares code with streamers/viewers (via Discord, Twitter, etc.)
4. Spectators go to `/spectate` route
5. Enter spectator code
6. Watch live debate in real-time
7. See live transcript
8. Hear AI analysis via TTS
9. See final results with complete analysis

## Troubleshooting

### Database Connection Failed
- Ensure PostgreSQL is running
- Check DB_HOST, DB_USER, DB_PASSWORD in .env
- Run `docker-compose down -v` to reset Docker volumes

### WebRTC Not Working
- Check browser console for errors
- Ensure HTTPS or localhost (WebRTC requires secure context)
- Test camera/microphone permissions in browser
- Check firewall/NAT settings

### API Not Responding
- Check backend logs: `docker-compose logs backend`
- Verify CORS settings in browser console
- Ensure backend port 4000 is not in use

### Groq API Errors
- Verify GROQ_API_KEY is set correctly
- Check API key is active at https://console.groq.com
- Review Groq API documentation for rate limits
- Free tier: 30 requests per minute

### TTS Not Working
- Check if browser supports Web Speech API (Chrome, Edge, Safari)
- Ensure TTS_ENABLED=true in backend/.env
- Verify volume isn't muted
- Try different browser if issues persist

## Why Groq Instead of Claude?

- **Free**: No API costs, free tier includes plenty of requests
- **Fast**: Lightning-fast inference perfect for real-time analysis
- **Flexible**: Easy to use, great for testing and development
- **Production Ready**: Scalable and reliable

## Production Deployment

1. **Environment Variables**
   - Change JWT_SECRET to a strong random value
   - Use production Groq API key
   - Set NODE_ENV=production

2. **Database**
   - Use managed PostgreSQL service (AWS RDS, Heroku, etc.)
   - Set up backups
   - Use strong password

3. **Frontend**
   - Build: `npm run build`
   - Deploy to Vercel, Netlify, or similar
   - Set REACT_APP_SERVER_URL to production backend URL

4. **Backend**
   - Deploy to AWS, Heroku, DigitalOcean, etc.
   - Use SSL/TLS encryption
   - Set up load balancer for multiple instances
   - Configure Groq API rate limiting

## Features Coming Soon

- [ ] Mobile app version
- [ ] Team debates (2v2, 3v3)
- [ ] Debate recording & replay
- [ ] Custom debate topics creation
- [ ] Streaming integration (Twitch, YouTube)
- [ ] Chat and reactions in spectator mode
- [ ] Advanced analytics and statistics

## Contributing

1. Create a feature branch
2. Make changes
3. Test locally with Docker Compose
4. Commit and push
5. Create pull request

## License

MIT

## Support

For issues, questions, or suggestions:
1. Check existing issues
2. Create detailed bug reports
3. Include logs and screenshots
4. Share your environment details

