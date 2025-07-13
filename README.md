# 🕵️ Mafia Game

A real-time multiplayer Mafia game that you can host and play with your friends!

## 🚀 How to Run

### Prerequisites
- Node.js installed on your computer
- A modern web browser

### Steps to Start the Game

1. **Open PowerShell/Command Prompt** in the game folder
2. **Install dependencies** (if not already done):
   ```
   npm install
   ```
3. **Start the server**:
   ```
   npm start
   ```
   or
   ```
   node server.js
   ```
4. **Open your browser** and go to: `http://localhost:3000`

## 🎮 How to Play

### For the Host (Game Creator):
1. Enter your username
2. Click "Create Room"
3. Share the room code with your friends
4. Wait for players to join
5. Click "Ready Up" when you're ready
6. Once all players are ready, click "Start Game"

### For Players Joining:
1. Enter your username
2. Click "Join Room"
3. Enter the room code provided by the host
4. Click "Ready Up" when you're ready
5. Wait for the host to start the game

## 🎯 Game Rules

### Roles:
- **🔪 Mafia**: Work together to eliminate townspeople. You win when Mafia equals or outnumbers remaining players.
- **🔍 Detective**: Each night, investigate one player to learn their true identity.
- **⚕️ Doctor**: Each night, protect one player from being eliminated.
- **👤 Civilian**: Use your voice and vote to help identify Mafia members.

### Game Flow:
1. **Night Phase**: Special roles (Mafia, Detective, Doctor) make their moves
2. **Day Phase**: All players discuss and vote to eliminate a suspect
3. **Repeat** until one team wins

## 🌐 Hosting for Friends

To let friends join from other computers:

1. **Find your computer's IP address**:
   - Open Command Prompt and type: `ipconfig`
   - Look for "IPv4 Address" (usually starts with 192.168.x.x)

2. **Share the address** with friends:
   - They should go to: `http://YOUR_IP_ADDRESS:3000`
   - Example: `http://192.168.1.100:3000`

3. **Make sure your firewall allows connections** on port 3000

## 🔧 Troubleshooting

- **Server won't start**: Make sure no other application is using port 3000
- **Friends can't connect**: Check your firewall settings and make sure you're sharing the correct IP address
- **Game not working**: Try refreshing the page or restarting the server

## 📁 Files Overview

- `server.js` - WebSocket server handling game logic
- `index.html` - Main game interface
- `scripts.js` - Frontend game logic
- `utils.js` - Utility functions
- `style.css` - Game styling
- `audio.js` - Sound effects

Enjoy playing Mafia with your friends! 🎉 