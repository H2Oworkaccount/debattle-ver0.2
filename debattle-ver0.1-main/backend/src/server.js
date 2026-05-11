const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
require('dotenv').config();
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

if (!process.env.JWT_SECRET) {
  console.warn('Warning: JWT_SECRET is not set. Using fallback development JWT secret. Set JWT_SECRET in .env for production.');
}

// Import routes and middleware
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const debateRoutes = require('./routes/debates');
const leaderboardRoutes = require('./routes/leaderboard');
const debateAnalyzer = require('./utils/debateAnalyzer');
const SpectatorService = require('./utils/spectatorService');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIO(server, {
  cors: {
    origin: function(origin, callback) {
      const allowed = process.env.FRONTEND_URL || 'http://localhost:3000';
      if (!origin || origin === allowed || origin.includes('.app.github.dev')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors({
  origin: "*"
}));
app.use(express.json());

// Initialize database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// Export pool for use in routes
module.exports.pool = pool;

// Initialize Spectator Service
const spectatorService = new SpectatorService(pool, io);

// Make pool and spectators available to routes
app.locals.pool = pool;
app.locals.io = io;
app.locals.spectatorService = spectatorService;

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/debates', debateRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Spectator routes
app.post('/api/spectate/join', async (req, res) => {
  const { code } = req.body;
  try {
    const spectatorInfo = await spectatorService.joinAsSpectator(
      code,
      req.ip
    );
    res.json(spectatorInfo);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected:', res.rows[0]);
  }
});

// ============================================
// Socket.IO Event Handling
// ============================================

// Store active users and waiting queue
const activeUsers = new Map(); // userId -> socket info
const roomQueue = []; // Waiting users for matchmaking
const activeRooms = new Map(); // roomId -> room data with full state
const debateTimers = new Map(); // roomId -> timer info

// Debate timing constants (in seconds)
const DEBATE_PHASES = {
  WAITING: 10,       // Wait for both players to be ready
  INITIAL_1: 30,      // Player 1 initial argument
  INITIAL_2: 30,      // Player 2 initial argument
  INTERMISSION: 25,   // AI analysis + display initial scores
  FINAL_1: 15,        // Player 1 final rebuttal
  FINAL_2: 15,        // Player 2 final rebuttal
};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User joins and enters queue for matchmaking
  socket.on('join_queue', async (data) => {
    const { userId, username } = data;
    
    console.log(`${username} (${userId}) joined queue`);
    
    // Store user info and socket reference
    activeUsers.set(userId, {
      socketId: socket.id,
      socket: socket,
      username,
      userId,
    });

    // Add to queue
    roomQueue.push({ userId, username, socketId: socket.id });

    // Check if we have 2 users for matchmaking
    if (roomQueue.length >= 2) {
      const proUser = roomQueue.shift();
      const conUser = roomQueue.shift();
      const roomId = uuidv4(); // ← fixed: was `room_${Date.now()}`

      // Get random debate topic
      try {
        const result = await pool.query(
          'SELECT id, topic_text FROM debate_topics ORDER BY RANDOM() LIMIT 1'
        );
        const topic = result.rows[0];

        // Store room data with full debate state
        activeRooms.set(roomId, {
          roomId,
          proUserId: proUser.userId,
          proUsername: proUser.username,
          conUserId: conUser.userId,
          conUsername: conUser.username,
          topicId: topic.id,
          topicText: topic.topic_text,
          startTime: Date.now(),
          transcript: [],
          proCues: [],
          conCues: [],
          proIntermissionCues: [],
          conIntermissionCues: [],
          currentPhase: 'WAITING',
          phaseStartTime: null,
          proScore: null,
          conScore: null,
          spectators: [],
          spectatorCode: null,
          proReady: false,
          conReady: false,
        });

        // Notify both users
        io.to(proUser.socketId).emit('matched', {
          roomId,
          side: 'pro',
          opponent: conUser.username,
          topic: topic.topic_text,
        });

        io.to(conUser.socketId).emit('matched', {
          roomId,
          side: 'con',
          opponent: proUser.username,
          topic: topic.topic_text,
        });

        // Have both players join the debate room so they receive room-wide broadcasts
        const proSocket = activeUsers.get(proUser.userId)?.socket;
        const conSocket = activeUsers.get(conUser.userId)?.socket;
        if (proSocket) proSocket.join(roomId);
        if (conSocket) conSocket.join(roomId);

        console.log(`Created debate room ${roomId}: ${proUser.username} (pro) vs ${conUser.username} (con)`);
      } catch (err) {
        console.error('Error fetching debate topic:', err);
      }
    }

    socket.emit('queue_status', {
      position: roomQueue.length,
      message: 'Waiting for opponent...',
    });
  });

  // Request spectator code
  socket.on('request_spectator_code', async (data) => {
    const { roomId, userId } = data;
    const room = activeRooms.get(roomId);

    if (room && (room.proUserId === userId || room.conUserId === userId)) {
      try {
        const spectatorCode = await spectatorService.createSpectatorCode(roomId, userId);
        room.spectatorCode = spectatorCode.code;

        io.to(socket.id).emit('spectator_code_created', {
          code: spectatorCode.code,
          roomId: roomId,
        });

        console.log(`Spectator code created for room ${roomId}: ${spectatorCode.code}`);
      } catch (err) {
        console.error('Error creating spectator code:', err);
        socket.emit('error', { message: 'Failed to create spectator code' });
      }
    }
  });

  // Join as spectator
  socket.on('join_as_spectator', async (data) => {
    const { code } = data;
    
    try {
      const spectatorCode = await spectatorService.getSpectatorCodeByCode(code);
      
      if (!spectatorCode) {
        return socket.emit('error', { message: 'Invalid spectator code' });
      }

      const roomId = spectatorCode.room_id;
      const room = activeRooms.get(roomId);

      if (!room) {
        return socket.emit('error', { message: 'Debate room not found' });
      }

      const spectatorNamespace = spectatorService.getSpectatorNamespace(roomId);
      socket.join(spectatorNamespace);

      room.spectators.push({
        socketId: socket.id,
        code,
      });

      socket.emit('spectator_joined', {
        roomId,
        room: {
          proUsername: room.proUsername,
          conUsername: room.conUsername,
          topic: room.topicText,
          phase: room.currentPhase,
          transcript: room.transcript,
        },
      });

      // Notify debaters of spectators
      const spectatorCount = await spectatorService.getSpectatorCount(roomId);
      io.to(roomId).emit('spectator_joined_notification', { count: spectatorCount });

      console.log(`Spectator joined room ${roomId}`);
    } catch (err) {
      console.error('Error joining as spectator:', err);
      socket.emit('error', { message: 'Failed to join as spectator' });
    }
  });

  // Player ready - wait for both players before starting countdown
  socket.on('player_ready', (data) => {
    const { roomId, userId } = data;
    const room = activeRooms.get(roomId);

    if (!room) return;

    // Mark player as ready
    if (room.proUserId === userId) {
      room.proReady = true;
    } else if (room.conUserId === userId) {
      room.conReady = true;
    }

    // If both players are ready, start the debate phases
    if (room.proReady && room.conReady) {
      startDebatePhases(roomId, room);
    }
  });

  // Relay WebRTC signaling data between players
  socket.on('peer_signal', (data) => {
    const { roomId, userId, signal } = data;
    const room = activeRooms.get(roomId);
    if (!room) return;

    const otherUserId = room.proUserId === userId ? room.conUserId : room.proUserId;
    const otherSocketId = activeUsers.get(otherUserId)?.socketId;

    if (otherSocketId) {
      io.to(otherSocketId).emit('peer_signal', {
        userId,
        signal,
      });
    }
  });

  // Submit argument during debate
  socket.on('debate_input', (data) => {
    const { roomId, text, userId, side } = data;
    const room = activeRooms.get(roomId);

    console.log('Received debate_input:', {
      roomId,
      userId,
      side,
      text,
      currentPhase: room?.currentPhase,
    });

    if (!room) return;

    let isProTurn = side === 'pro' && (room.currentPhase === 'INITIAL_1' || room.currentPhase === 'FINAL_1');
    let isConTurn = side === 'con' && (room.currentPhase === 'INITIAL_2' || room.currentPhase === 'FINAL_2');

    // Allow buffered speech submitted immediately after the phase boundary
    if (!isProTurn && side === 'pro' && room.currentPhase === 'INITIAL_2' && room.proCues.length === 0) {
      isProTurn = true;
      console.log('Accepting late pro argument for INITIAL_1 by phase boundary flush');
    }
    if (!isConTurn && side === 'con' && room.currentPhase === 'INTERMISSION' && room.conCues.length === 0) {
      isConTurn = true;
      console.log('Accepting late con argument for INITIAL_2 by phase boundary flush');
    }
    if (!isProTurn && side === 'pro' && room.currentPhase === 'FINAL_2' && room.proIntermissionCues.length === 0) {
      isProTurn = true;
      console.log('Accepting late pro argument for FINAL_1 by phase boundary flush');
    }

    if (!isProTurn && !isConTurn) {
      socket.emit('error', { message: 'Not your turn to speak' });
      return;
    }

    const timestamp = new Date().toLocaleTimeString();
    
    if (room.currentPhase === 'INITIAL_1' || room.currentPhase === 'INITIAL_2') {
      if (side === 'pro') {
        room.proCues.push(text);
      } else {
        room.conCues.push(text);
      }
    } else if (room.currentPhase === 'FINAL_1' || room.currentPhase === 'FINAL_2') {
      if (side === 'pro') {
        room.proIntermissionCues.push(text);
      } else {
        room.conIntermissionCues.push(text);
      }
    }

    room.transcript.push({ userId, side, text, timestamp, phase: room.currentPhase });

    const spectatorNamespace = spectatorService.getSpectatorNamespace(roomId);
    io.to(roomId).emit('debate_input_received', {
      side,
      text,
      username: activeUsers.get(userId)?.username,
      timestamp,
    });
    io.to(spectatorNamespace).emit('debate_input_received', {
      side,
      text,
      username: activeUsers.get(userId)?.username,
      timestamp,
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    let disconnectedUserId;
    for (const [userId, userInfo] of activeUsers.entries()) {
      if (userInfo.socketId === socket.id) {
        disconnectedUserId = userId;
        break;
      }
    }

    if (disconnectedUserId) {
      activeUsers.delete(disconnectedUserId);
      const queueIndex = roomQueue.findIndex(u => u.userId === disconnectedUserId);
      if (queueIndex !== -1) {
        roomQueue.splice(queueIndex, 1);
      }
      console.log('User disconnected:', disconnectedUserId);
    }
  });
});

// Debate phase management
function startDebatePhases(roomId, room) {
  const phases = ['WAITING', 'INITIAL_1', 'INITIAL_2', 'INTERMISSION', 'FINAL_1', 'FINAL_2'];

  const runPhase = async (phaseIndex) => {
    if (!room || phaseIndex >= phases.length) {
      await endDebate(roomId, room);
      return;
    }

    const phaseName = phases[phaseIndex];
    room.currentPhase = phaseName;
    room.phaseStartTime = Date.now();

    const phaseDuration = DEBATE_PHASES[phaseName];
    let timeRemaining = phaseDuration;

    const spectatorNamespace = spectatorService.getSpectatorNamespace(roomId);
    io.to(roomId).emit('phase_started', { phase: phaseName, duration: phaseDuration });
    io.to(spectatorNamespace).emit('phase_started', { phase: phaseName, duration: phaseDuration });

    if (phaseName === 'INITIAL_1') {
      io.to(activeUsers.get(room.proUserId)?.socketId).emit('your_turn', { side: 'pro', phase: phaseName });
    } else if (phaseName === 'INITIAL_2') {
      io.to(activeUsers.get(room.conUserId)?.socketId).emit('your_turn', { side: 'con', phase: phaseName });
    } else if (phaseName === 'INTERMISSION') {
      handleIntermission(roomId, room);
    } else if (phaseName === 'FINAL_1') {
      io.to(activeUsers.get(room.proUserId)?.socketId).emit('your_turn', { side: 'pro', phase: phaseName });
    } else if (phaseName === 'FINAL_2') {
      io.to(activeUsers.get(room.conUserId)?.socketId).emit('your_turn', { side: 'con', phase: phaseName });
    }

    const timerInterval = setInterval(() => {
      timeRemaining--;
      const spectatorNamespace = spectatorService.getSpectatorNamespace(roomId);
      io.to(roomId).emit('phase_timer', { phase: phaseName, timeRemaining });
      io.to(spectatorNamespace).emit('phase_timer', { phase: phaseName, timeRemaining });

      if (timeRemaining <= 0) {
        clearInterval(timerInterval);
        runPhase(phaseIndex + 1);
      }
    }, 1000);

    debateTimers.set(roomId, timerInterval);
  };

  runPhase(0);
}

async function handleIntermission(roomId, room) {
  try {
    const analysisResult = await debateAnalyzer.analyzeDebate(
      room.topicText,
      room.proCues,
      room.conCues
    );

    room.proScore = analysisResult.proScore;
    room.conScore = analysisResult.conScore;

    const spectatorNamespace = spectatorService.getSpectatorNamespace(roomId);
    io.to(roomId).emit('intermission_analysis', {
      proScore: analysisResult.proScore,
      conScore: analysisResult.conScore,
      analysis: analysisResult.analysis,
    });
    io.to(spectatorNamespace).emit('intermission_analysis', {
      proScore: analysisResult.proScore,
      conScore: analysisResult.conScore,
      analysis: analysisResult.analysis,
    });

    console.log(`Initial analysis for room ${roomId}: Pro=${analysisResult.proScore}, Con=${analysisResult.conScore}`);
  } catch (err) {
    console.error('Error during intermission analysis:', err);
  }
}

async function endDebate(roomId, room) {
  if (!room) return;

  try {
    const allProArguments = [...room.proCues, ...room.proIntermissionCues];
    const allConArguments = [...room.conCues, ...room.conIntermissionCues];

    const analysisResult = await debateAnalyzer.analyzeDebate(
      room.topicText,
      allProArguments,
      allConArguments
    );

    const winner = analysisResult.proScore > analysisResult.conScore ? room.proUserId : room.conUserId;
    const finalProScore = analysisResult.proScore;
    const finalConScore = analysisResult.conScore;

    await pool.query(
      `INSERT INTO debates (room_id, pro_user_id, con_user_id, topic_id, winner_id, pro_score, con_score, transcript, analysis, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'completed')
       RETURNING id`,
      [
        roomId,
        room.proUserId,
        room.conUserId,
        room.topicId,
        winner,
        finalProScore,
        finalConScore,
        JSON.stringify(room.transcript),
        JSON.stringify(analysisResult.analysis),
      ]
    );

    await updateUserStats(room.proUserId, winner === room.proUserId);
    await updateUserStats(room.conUserId, winner === room.conUserId);

    const spectatorNamespace = spectatorService.getSpectatorNamespace(roomId);
    io.to(roomId).emit('debate_ended', {
      winner: activeUsers.get(winner)?.username,
      proScore: finalProScore,
      conScore: finalConScore,
      analysis: analysisResult.analysis,
    });
    io.to(spectatorNamespace).emit('debate_ended', {
      winner: activeUsers.get(winner)?.username,
      proScore: finalProScore,
      conScore: finalConScore,
      analysis: analysisResult.analysis,
    });

    if (debateTimers.has(roomId)) {
      clearInterval(debateTimers.get(roomId));
      debateTimers.delete(roomId);
    }
    activeRooms.delete(roomId);

    console.log(`Debate ${roomId} finished. Winner: ${activeUsers.get(winner)?.username} (${finalProScore} vs ${finalConScore})`);
  } catch (err) {
    console.error('Error ending debate:', err);
  }
}

async function updateUserStats(userId, isWin) {
  try {
    const result = await pool.query(
      'SELECT wins, losses, debates_count FROM user_stats WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length > 0) {
      const stats = result.rows[0];
      const newWins = stats.wins + (isWin ? 1 : 0);
      const newLosses = stats.losses + (isWin ? 0 : 1);
      const newCount = stats.debates_count + 1;
      const winRate = (newWins / newCount * 100).toFixed(2);

      await pool.query(
        `UPDATE user_stats 
         SET wins = $1, losses = $2, debates_count = $3, win_rate = $4, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $5`,
        [newWins, newLosses, newCount, winRate, userId]
      );
    }
  } catch (err) {
    console.error('Error updating user stats:', err);
  }
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Debattle server running on port ${PORT}`);
  console.log(`Groq API enabled for debate analysis`);
});

module.exports = server;