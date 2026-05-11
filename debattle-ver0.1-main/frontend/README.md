# Debattle Frontend

React web application for the Debattle debate platform.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Environment variables are configured in `.env`

## Running Locally

```bash
npm start
```

The app will open at `http://localhost:3000`

## Docker

```bash
docker build -t debattle-frontend .
docker run -p 3000:3000 debattle-frontend
```

## Features

- **Authentication** - Register and login
- **Dashboard** - View stats, find opponents, access leaderboard
- **Real-time Debate** - Video/audio with opponent, submit arguments
- **WebRTC** - Peer-to-peer video/audio using Simple-Peer
- **Leaderboard** - View global rankings

## Pages

- `/` - Authentication page
- `/dashboard` - Main dashboard with stats
- `/debate` - Active debate page
- `/leaderboard` - Global leaderboard

## Technologies

- React 18
- React Router v6
- Socket.IO for real-time communication
- Simple-Peer for WebRTC
- Axios for API calls
