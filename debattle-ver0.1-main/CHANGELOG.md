# Debattle v0.2 - Major Updates

## 🎉 What's New

This update brings major new features perfect for streamers, improved AI analysis, and better timing for competitive debates.

## 🔄 API Changes

### ✅ Switched to Groq (FREE!)
- **From**: Anthropic Claude ($$$)
- **To**: Groq Mixtral 8x7B (FREE tier with 30 req/min)
- **Why**: Cost-free testing, lightning-fast inference, perfect for real-time analysis
- **Setup**: Visit https://console.groq.com to get free API key

**Migration Steps**:
1. Replace `ANTHROPIC_API_KEY` with `GROQ_API_KEY` in `.env`
2. Update backend dependencies: `npm install` (groq-sdk replaces @anthropic-ai/sdk)
3. That's it! Everything else works the same

## 🎬 New Feature: Spectator Mode

Perfect for **streamers, content creators, and events**!

### How It Works:
1. Debater clicks "🎥 Enable Spectators" during debate
2. Gets a 6-character code (e.g., `A3K9X2`)
3. Shares code via Twitch chat, Discord, Twitter, etc.
4. Viewers visit `/spectate` and enter code
5. Spectators see:
   - Live debate with both players' video feeds
   - Real-time transcript of arguments
   - AI analysis with scores
   - All with Web Speech TTS narration

### Database Changes:
- Added `spectator_codes` table
- Added `spectators` table
- New indexes for spectator lookups

## ⏱️ Structured Debate Timing

### New Format: 1:30 Total (Previously: Unlimited)

```
Phase 1 (30s):  Pro opening argument
Phase 2 (30s):  Con opening argument  
Phase 3 (25s):  Intermission - AI analysis & initial scores
Phase 4 (15s):  Pro final rebuttal
Phase 5 (15s):  Con final rebuttal
Final:          Winner announcement with complete analysis
```

### Backend Changes:
- Debate phases now managed by server timer
- `current_phase` tracks debate state
- Clients receive `phase_started` and `phase_timer` events
- Server enforces timing automatically

### Frontend Changes:
- Phase badge shows current state
- Timer displays seconds remaining
- Clear visual feedback on whose turn it is
- "🔴 YOUR TURN" indicator for active players

## 🎧 New Feature: Text-to-Speech (TTS)

### How It Works:
- Click 🔊 button to hear AI analysis
- Browser's native Web Speech API (no extra dependencies)
- Works on Chrome, Edge, Safari, Firefox
- No API costs!

### Where Available:
- During intermission analysis
- In final debate results
- For spectators watching live

### Implementation:
- Uses `SpeechSynthesisUtterance` API
- Automatically speak analysis text
- Stop button to cancel playback

## 🤖 Improved AI Analysis

### Better Reasoning:
- More detailed strength/weakness identification
- Explicit "winner" determination
- "Reasoning" field explains why one side won
- Analysis of logical consistency and rhetoric

### Scoring Improvements:
- Considers multiple factors:
  - Logical consistency
  - Evidence/examples used
  - Counter-argument acknowledgment
  - Persuasiveness

## 📊 Database Enhancements

### New Tables:
```sql
-- Spectator access codes
CREATE TABLE spectator_codes (
  id UUID PRIMARY KEY,
  room_id UUID,
  code VARCHAR(10) UNIQUE,
  created_by UUID,
  expires_at TIMESTAMP
);

-- Spectator sessions
CREATE TABLE spectators (
  id UUID PRIMARY KEY,
  spectator_code_id UUID,
  viewer_ip VARCHAR(50),
  joined_at TIMESTAMP
);
```

### Schema Version:
- v2: Added spectator support
- Full backward compatibility with debate/user data

## 🔄 WebSocket Event Changes

### New Events for Spectators:
```javascript
// Request spectator code
socket.emit('request_spectator_code', { roomId, userId });

// Spectator joins
socket.emit('join_as_spectator', { code });

// Broadcasting events include spectator namespace
socket.to(spectators_${roomId}).emit(event, data);
```

### New Events for Phases:
```javascript
socket.on('phase_started', { phase, duration });
socket.on('phase_timer', { phase, timeRemaining });
socket.on('your_turn', { side, phase });
socket.on('intermission_analysis', { proScore, conScore, analysis });
```

## 📁 File Changes

### New Files:
- `frontend/src/pages/Spectator.jsx` - Spectator mode UI
- `frontend/src/pages/Spectator.css` - Spectator styling
- `backend/src/utils/spectatorService.js` - Spectator management

### Modified Files:
- `backend/src/server.js` - Major refactor for phases & spectators
- `backend/src/utils/debateAnalyzer.js` - Updated for Groq
- `frontend/src/pages/Debate.jsx` - Phase system, TTS support
- `frontend/src/pages/Debate.css` - New phase UI elements
- `frontend/src/App.jsx` - Added `/spectate` route
- `backend/package.json` - groq-sdk instead of anthropic
- `backend/.env.example` - GROQ_API_KEY instead of ANTHROPIC
- `backend/db/schema.sql` - Added spectator tables
- `docker-compose.yml` - Updated env vars

## 📈 Performance Impact

- ✅ Faster AI responses (Groq is lightning-fast)
- ✅ Lower costs (free vs. paid)
- ✅ Scalable spectator broadcasting (Socket.IO rooms)
- ✅ No performance degradation with multiple spectators

## 🔐 Security Updates

- Spectator codes expire after 2 hours
- Codes are unique 6-character random strings
- Spectator IP logged (optional analytics)
- Existing auth/encryption unchanged

## 📚 Documentation Updates

- Updated [SETUP_GUIDE.md](SETUP_GUIDE.md) with Groq setup
- Updated [README.md](README.md) with spectator/TTS features
- Enhanced [backend/README.md](backend/README.md) with full WebSocket events
- Added debate timing documentation

## 🚀 Migration Guide

### For Existing Deployments:

```bash
# 1. Update environment
#    Change ANTHROPIC_API_KEY to GROQ_API_KEY in .env

# 2. Update backend
cd backend
git pull
npm install  # Installs groq-sdk

# 3. Update database
npm run db:init  # Adds new tables

# 4. Update frontend
cd ../frontend
git pull
npm install

# 5. Restart everything
docker-compose down
docker-compose up
```

### Backward Compatibility:
- ✅ Existing user data: No changes
- ✅ Existing debate history: No changes
- ✅ Existing leaderboard: No changes
- ✅ Only new features added

## 🎯 Breaking Changes

None! Complete backward compatibility with database and user data.

## 🆕 Routes

### New Spectator Routes:
- `GET /spectate` - Spectator mode page
- `POST /api/spectate/join` - Join debate as spectator

### Existing Routes (Unchanged):
- All auth endpoints
- All user endpoints
- All debate endpoints
- All leaderboard endpoints

## 🔮 Next Steps

Streamers can now:
1. Set up Twitch/YouTube channel
2. Enable spectators during debates
3. Share spectator code in chat
4. Viewers tune in to watch live debates!

## 📝 Commit Summary

```
✨ feat: Add spectator mode for live streaming
✨ feat: Implement TTS for AI analysis narration
✨ feat: Add structured debate phases with timing
✨ feat: Switch to Groq API (free tier)
🔧 refactor: Rewrite debate phase management
📚 docs: Update all documentation for new features
🔒 security: Add spectator code expiration
⚡ perf: Optimize AI response time with Groq
🐛 fix: Various WebSocket event handling improvements
```

## 📞 Support

Questions about new features? Check:
- [SETUP_GUIDE.md](SETUP_GUIDE.md) - Installation & troubleshooting
- [backend/README.md](backend/README.md) - API documentation
- [README.md](README.md) - Feature overview

## 🙏 Thank You!

This update makes Debattle perfect for streamers and content creators.

Enjoy streaming debates! 🎤🎬
