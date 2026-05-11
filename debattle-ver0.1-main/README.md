# 🎤 Debattle - Real-Time AI-Powered Debate Platform

A web application where users can debate each other in real-time on lighthearted topics, with AI-powered analysis determining the winner based on argument quality and debate skills.

## Features

- **Real-time Video/Audio**: WebRTC support for webcam and microphone
- **AI-Powered Analysis**: Groq AI (free tier) analyzes arguments in real-time to score debates
- **Ranked System**: Track wins/losses and compete on the leaderboard
- **Random Matchmaking**: Find random opponents and get assigned debate sides (Pro/Con)
- **Lighthearted Topics**: Fun, non-serious debate prompts
- **Private Rooms**: Secure 1v1 debate sessions
- **Structured Timing**: 1:30 debate format with 5 phases (30s initial + 30s initial + 25s analysis + 15s final + 15s final)
- **Spectator Mode**: Streamers can share codes for viewers to watch live debates
- **Text-to-Speech**: AI analysis narrated aloud with browser TTS
- **Google OAuth**: One-click sign-in (optional setup)
- **Free AI**: Uses Groq's free tier (30 requests/minute)

## Tech Stack

- **Frontend**: React with WebRTC (Simple-Peer)
- **Backend**: Node.js + Express + Socket.IO + Passport.js
- **Database**: PostgreSQL
- **AI**: Groq API (free tier, Mixtral 8x7B)
- **Authentication**: JWT + Google OAuth 2.0
- **Deployment**: Docker

## Project Structure

```
debattle-ver0.1/
├── backend/               # Node.js/Express server
│   ├── src/
│   │   ├── server.js
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── middleware/
│   │   └── utils/
│   ├── db/
│   │   └── schema.sql
│   ├── .env.example
│   ├── package.json
│   └── Dockerfile
├── frontend/              # React app
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── App.js
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

# 🎤 Debattle - Real-Time AI-Powered Debate Platform

A web application where users can debate each other in real-time on lighthearted topics, with AI-powered analysis determining the winner based on argument quality and debate skills. Perfect for streamers, content creators, and casual debaters!

## ✨ Key Features

- **Real-time Video/Audio**: WebRTC support for webcam and microphone
- **Structured Debate Timing**: 1:30 total with specific phases for fair competition
- **AI-Powered Analysis**: Groq's fast AI analyzes arguments in real-time
- **Text-to-Speech**: Hear AI analysis instead of reading it (🎧 Web Speech API)
- **Spectator Mode**: Streamers can stream debates with shareable codes
- **Ranked System**: Track wins/losses and compete on the leaderboard
- **Random Matchmaking**: Find opponents instantly and get assigned debate sides
- **Live Transcript**: See what's being said in real-time
- **Private Rooms**: Secure 1v1 debate sessions

## 🎮 Try It Out

### Debate Phases (Total: 1:30)

```
📌 Phase 1 (30s): Pro player presents initial argument
📌 Phase 2 (30s): Con player presents initial argument
🤖 Phase 3 (25s): AI analyzes arguments, displays initial scores
📌 Phase 4 (15s): Pro player delivers final rebuttal
📌 Phase 5 (15s): Con player delivers final rebuttal
🏆 Final Analysis: AI determines winner with detailed reasoning
```

### Spectator Mode

Debaters can enable spectators during a debate:
1. Click "🎥 Enable Spectators" button
2. Get a 6-character code (e.g., `A3K9X2`)
3. Share code with streamers/viewers
4. They visit `/spectate` and enter the code
5. Watch live debate with real-time transcript
6. Hear AI commentary via speaker icon

## 🚀 Getting Started

### Quick Start with Docker (Recommended)

```bash
# 1. Get free Groq API key from https://console.groq.com

# 2. Create backend/.env
GROQ_API_KEY=your_groq_api_key_here

# 3. Start everything
docker-compose up

# 4. Open browser
# Frontend: http://localhost:3000
```

For detailed setup instructions, see [SETUP_GUIDE.md](SETUP_GUIDE.md)

## 🎮 Topic Examples

- "Brain freeze makes you lose brain cells"
- "Pokemon cards can make you a millionaire"
- "Pineapple belongs on pizza"
- "Cats are better than dogs"
- "Video games make you smarter"
- And many more...

## 📚 Documentation

- [Setup Guide](SETUP_GUIDE.md) - Detailed installation instructions
- [Backend API](backend/README.md) - Server documentation
- [Frontend Guide](frontend/README.md) - React app documentation
- [Database Schema](backend/db/schema.sql) - Database structure

## 🛠 Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | React 18, Socket.IO, WebRTC (Simple-Peer) |
| Backend | Node.js, Express, Socket.IO |
| Database | PostgreSQL |
| AI | Groq's Mixtral 8x7B (FREE!) |
| TTS | Web Speech API (Browser Native) |
| Deployment | Docker, Docker Compose |

## 🌐 System Architecture

```
┌─────────────────────────────────┐
│   📱 React Web App (Port 3000)   │
│  - Debate Interface              │
│  - Spectator Mode                │
│  - Web Speech TTS                │
└────────────┬──────────────────────┘
             │ Socket.IO / HTTP
             ↓
┌─────────────────────────────────┐
│  🚀 Node.js Server (Port 4000)  │
│  - Matchmaking                  │
│  - WebRTC Signaling             │
│  - Debate Phases                │
│  - Spectator Broadcasting       │
└────────────┬──────────────────────┘
             │
    ┌────────┴────────┐
    ↓                 ↓
┌─────────┐      ┌──────────┐
│📦 PostgreSQL│  │🤖 Groq API│
│ Database   │  │ AI Analysis│
└─────────┘      └──────────┘
```

## 🎯 How It Works

### For Debaters:
1. **Register/Login** - Create your account
2. **Find Opponent** - Click "Find Opponent" to join matchmaking
3. **Debate** - Get assigned a topic, see opponent via webcam
4. **Follow Phases** - Present arguments during your turn
5. **See Results** - AI determines winner with analysis
6. **Climb Leaderboard** - Win debates to improve your rating

### For Spectators:
1. **Get Code** - Ask debater for spectator code
2. **Join** - Visit `/spectate` and enter code
3. **Watch** - See live debate with real-time transcript
4. **Listen** - Click 🔊 button to hear AI analysis

## 🔐 Security

- JWT token-based authentication
- Password hashing with bcryptjs
- CORS security headers
- Environment variable protection
- Database query parameterization

## ⚡ Performance

- WebRTC for peer-to-peer communication (reduces server load)
- Socket.IO for low-latency updates
- PostgreSQL for efficient data storage
- Docker for containerized deployment
- Groq for lightning-fast AI inference

## 📋 Prerequisites

- Docker & Docker Compose (easiest)
- OR: Node.js 18+, PostgreSQL 15+
- Modern web browser with WebRTC support (Chrome, Firefox, Edge, Safari)
- Free Groq API key from https://console.groq.com

## 🚨 Important Notes

- **Browser**: Chrome, Firefox, or Edge recommended for best WebRTC compatibility
- **Camera/Microphone**: Browser will ask for permissions - allow them!
- **Network**: Stable internet connection required
- **Free AI**: Groq free tier - no API costs!
- **HTTPS**: Required for production (localhost works in development)

## 💡 Why Groq?

- **Free** with generous rate limits
- **Fast** - Lightning-fast inference perfect for real-time analysis
- **Easy to use** - Simple API integration
- **Production ready** - Reliable and scalable
- **Perfect for testing** - No subscription concerns during development

## 🎬 Use Cases

- **Content Creators**: Stream debates on Twitch/YouTube
- **Casual Debaters**: Practice debate skills with friends
- **Events**: Host debate tournaments
- **Entertainment**: Fun lighthearted debates
- **Education**: Learn debate techniques

## 📜 Debate Transcript Example

```
Pro: "Pineapple on pizza adds sweetness that complements the savory cheese"
Con: "Pizza should have only savory toppings - fruit doesn't belong!"
Pro: "Hawaiian pizza is popular in many countries - clearly people enjoy it"
Con: "Popularity doesn't equal correctness - majority isn't always right"

🤖 AI Analysis:
- Pro: Good use of examples, appeals to popularity
- Con: Logical fallacy identification shows critical thinking
- Winner: Con (stronger argumentation)
```

## 🔮 Future Features

- [ ] Mobile app version
- [ ] Team debates (2v2, 3v3)
- [ ] Debate recording & replay
- [ ] Custom debate topics creation
- [ ] Streaming integration (Twitch, YouTube)
- [ ] Chat and reactions for spectators
- [ ] Advanced analytics and statistics
- [ ] Tournament mode
- [ ] Debate coaching AI feedback

## 📞 Support & Issues

Found a bug? Have a suggestion?
1. Check the [SETUP_GUIDE](SETUP_GUIDE.md) for troubleshooting
2. Create a detailed issue with logs
3. Include reproduction steps

## 📄 License

MIT License

## 🎉 Get Started Now!

```bash
# 1. Get free Groq API key
# Visit: https://console.groq.com

# 2. Clone and setup
git clone <repo>
cd debattle-ver0.1

# 3. Add API key to backend/.env
# GROQ_API_KEY=your_key_here

# 4. Run
docker-compose up

# 5. Visit http://localhost:3000
```

---

**Made with ❤️ for debaters and streamers everywhere**
