# Debattle Backend

The Node.js/Express server for the Debattle debate platform with Groq AI integration and spectator support.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

3. Add your Groq API key to `.env`:
```
GROQ_API_KEY=your_groq_api_key_here
```

Get free Groq API key: https://console.groq.com

## Running Locally

```bash
# Development with nodemon
npm run dev

# Production
npm start
```

## Database

Initialize the database schema:
```bash
npm run db:init
```

## Docker

```bash
docker build -t debattle-backend .
docker run -p 4000:4000 debattle-backend
```

## REST API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
  - Body: `{ username, email, password }`
  
- `POST /api/auth/login` - Login user
  - Body: `{ email, password }`

### Users
- `GET /api/users/profile/:userId` - Get user profile with stats
- `GET /api/users/:userId/debate-history` - Get user's debate history (last 20)

### Debates
- `GET /api/debates/:debateId` - Get debate details and results

### Leaderboard
- `GET /api/leaderboard/global?limit=100` - Get global leaderboard
- `GET /api/leaderboard/rank/:userId` - Get user's current rank

### Spectator Routes
- `POST /api/spectate/join` - Join a debate as spectator
  - Body: `{ code }`
  - Returns: `{ spectatorId, roomId }`

## WebSocket Events

### Connection
```javascript
socket.on('connect', () => {
  console.log('Connected to server');
});
```

### Client -> Server Events

#### Matchmaking
```javascript
socket.emit('join_queue', { 
  userId: 'uuid',
  username: 'player_name'
});
```

#### Debate Control
```javascript
socket.emit('start_debate', { 
  roomId: 'room_id'
});

socket.emit('debate_input', {
  roomId: 'room_id',
  userId: 'user_id',
  side: 'pro' | 'con',
  text: 'argument text'
});

socket.emit('end_debate', {
  roomId: 'room_id',
  userId: 'user_id'
});
```

#### Spectator
```javascript
socket.emit('request_spectator_code', {
  roomId: 'room_id',
  userId: 'user_id'
});
```

#### WebRTC Signaling
```javascript
socket.emit('webrtc_offer', {
  roomId: 'room_id',
  offer: sdpOffer
});

socket.emit('webrtc_answer', {
  roomId: 'room_id',
  answer: sdpAnswer
});

socket.emit('ice_candidate', {
  roomId: 'room_id',
  candidate: iceCandidate
});
```

### Server -> Client Events

#### Matchmaking
```javascript
socket.on('queue_status', (data) => {
  data.position;  // Position in queue
  data.message;   // Status message
});

socket.on('matched', (data) => {
  data.roomId;       // Debate room ID
  data.side;         // 'pro' or 'con'
  data.opponent;     // Opponent username
  data.topic;        // Debate topic
});
```

#### Debate Phases (1:30 total)
```javascript
// Phase sequence: INITIAL_1 (30s) → INITIAL_2 (30s) → INTERMISSION (25s) → FINAL_1 (15s) → FINAL_2 (15s)

socket.on('phase_started', (data) => {
  data.phase;     // 'INITIAL_1', 'INITIAL_2', 'INTERMISSION', 'FINAL_1', 'FINAL_2'
  data.duration;  // Duration in seconds
});

socket.on('phase_timer', (data) => {
  data.phase;           // Current phase
  data.timeRemaining;   // Seconds left
});

socket.on('your_turn', (data) => {
  data.side;   // 'pro' or 'con'
  data.phase;  // Which phase it is
});
```

#### Debate Input
```javascript
socket.on('debate_input_received', (data) => {
  data.side;       // 'pro' or 'con'
  data.text;       // The argument
  data.username;   // Who said it
  data.timestamp;  // When
});
```

#### AI Analysis
```javascript
// During intermission phase
socket.on('intermission_analysis', (data) => {
  data.proScore;    // 0-100
  data.conScore;    // 0-100
  data.analysis;    // Detailed analysis object
  // analysis: {
  //   proStrengths: [],
  //   proWeaknesses: [],
  //   conStrengths: [],
  //   conWeaknesses: [],
  //   summary: 'AI summary',
  //   reasoning: 'Why this side won'
  // }
});
```

#### Spectator
```javascript
socket.on('spectator_code_created', (data) => {
  data.code;    // 6-character code (e.g., 'A3K9X2')
  data.roomId;  // Room ID
});

socket.on('spectator_joined_notification', (data) => {
  data.count;   // Number of spectators joined
});

socket.on('spectator_joined', (data) => {
  // Return event for spectators who join
  data.roomId;  // Room ID
  data.room;    // Room data:
  //   proUsername, conUsername, topic, phase, transcript
});
```

#### Debate Results
```javascript
socket.on('debate_ended', (data) => {
  data.winner;      // Username of winner
  data.proScore;    // Final pro score
  data.conScore;    // Final con score
  data.analysis;    // Complete analysis
});

socket.on('error', (data) => {
  data.message;     // Error description
});
```

## Debate Timing Structure

```
Total Duration: 1 minute 30 seconds

Phase 1 (0:00-0:30): INITIAL_1
- Pro player presents opening argument
- 30 seconds to speak

Phase 2 (0:30-1:00): INITIAL_2
- Con player presents opening argument
- 30 seconds to speak

Phase 3 (1:00-1:25): INTERMISSION
- AI analyzes initial arguments
- Initial scores displayed
- 25 seconds of analysis

Phase 4 (1:25-1:40): FINAL_1
- Pro player delivers final rebuttal
- 15 seconds to speak

Phase 5 (1:40-1:55): FINAL_2
- Con player delivers final rebuttal
- 15 seconds to speak

Final Analysis (1:55+):
- Complete AI analysis generated
- Winner determined and announced
```

## Database Schema

### Tables
- `users` - User accounts
- `user_stats` - Rankings and statistics
- `debates` - Debate history with full transcripts
- `debate_topics` - Pool of 10+ debate topics
- `spectator_codes` - One-time use spectator codes
- `spectators` - Spectator session tracking

See `db/schema.sql` for full schema with indexes.

## Groq AI Integration

Uses Groq's **Mixtral 8x7B** model for debate analysis:
- **Free tier**: 30 requests/minute (plenty for development)
- **Fast**: Lightning-fast inference (sub-second response time)
- **Comprehensive**: Analyzes arguments, identifies strengths/weaknesses
- **Scoring**: Rates each side 0-100 based on rhetoric and logic

### API Response Example
```json
{
  "proScore": 72,
  "conScore": 68,
  "analysis": {
    "proStrengths": ["Used specific examples", "Addressed counterarguments"],
    "proWeaknesses": ["Relied on emotion"],
    "conStrengths": ["Strong logical consistency"],
    "conWeaknesses": ["Limited real-world examples"],
    "summary": "Pro side was more persuasive due to...",
    "winner": "PRO"
  }
}
```

## Environment Variables

```env
# Server
PORT=4000
NODE_ENV=development

# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=debattle
DB_USER=debattle_user
DB_PASSWORD=debattle_password

# JWT
JWT_SECRET=your_secret_key

# Groq AI
GROQ_API_KEY=your_groq_key

# CORS
FRONTEND_URL=http://localhost:3000

# Features
TTS_ENABLED=true
```

## Project Structure

```
backend/
├── src/
│   ├── server.js              # Main server with Socket.IO
│   ├── routes/
│   │   ├── auth.js           # Authentication
│   │   ├── users.js          # User profiles
│   │   ├── debates.js        # Debate details
│   │   └── leaderboard.js    # Rankings
│   ├── middleware/
│   │   └── auth.js           # JWT verification
│   ├── utils/
│   │   ├── debateAnalyzer.js # Groq AI integration
│   │   └── spectatorService.js # Spectator management
├── db/
│   └── schema.sql            # Database schema
├── package.json
├── .env.example
└── Dockerfile
```

## Key Features

✅ Real-time matchmaking with Socket.IO
✅ Structured debate phases with timers
✅ Groq AI rapid debate analysis
✅ WebRTC peer-to-peer signaling
✅ PostgreSQL data persistence
✅ Spectator mode with 6-char codes
✅ Live transcript tracking
✅ User ranking system
✅ JWT authentication
✅ Docker deployment ready

## Performance Considerations

- WebRTC handles video/audio (not on server)
- Single server can handle 1000+ concurrent connections
- PostgreSQL indexes on frequently queried fields
- Groq API is extremely fast (< 1 second response typical)
- Socket.IO rooms for efficient broadcasts

## Scaling Tips

1. **Horizontal scaling**: Run multiple server instances
2. **Load balancing**: Use nginx or load balancer
3. **Database**: Consider connection pooling
4. **Cache**: Add Redis for session data
5. **CDN**: Use for frontend assets

## Troubleshooting

### WebSocket Connection Failed
- Check CORS settings
- Verify FRONTEND_URL matches client URL
- Check firewall/NAT settings
- Look at browser network tab for errors

### Database Errors
- Verify PostgreSQL is running
- Check DB credentials in .env
- Run `npm run db:init` to setup schema
- Check disk space if insert fails

### Groq API Errors
- Verify GROQ_API_KEY is correct
- Check rate limits (30 req/min free tier)
- Review Groq console for errors
- Check network connection

### Debate Not Starting
- Ensure both players have stable connections
- Check browser console for errors
- Verify WebRTC offers/answers sent
- Try different browser

## License

MIT

## Support

For issues or questions, see main repository issue tracker.

