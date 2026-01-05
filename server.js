const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const gameService = require('./services/gameService');

// Load env variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static Files Middleware
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/game', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'game.html'));
});

// API Routes
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

// Socket.IO Connection Handling
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Create a new room
    socket.on('createRoom', () => {
        const roomCode = gameService.createRoom(socket.id);
        socket.join(roomCode);
        socket.roomCode = roomCode;
        socket.emit('roomCreated', { roomCode, playerId: socket.id });
        console.log(`Room created: ${roomCode}`);
    });

    // Join an existing room
    socket.on('joinRoom', (roomCode) => {
        const result = gameService.joinRoom(roomCode, socket.id);
        
        if (result.success) {
            socket.join(roomCode);
            socket.roomCode = roomCode;
            socket.emit('roomJoined', { roomCode, playerId: socket.id });
            
            // Notify both players that the game can start
            io.to(roomCode).emit('gameReady', {
                message: 'Both players connected! Make your choice.'
            });
            console.log(`Player joined room: ${roomCode}`);
        } else {
            socket.emit('error', { message: result.error || 'Unable to join room' });
        }
    });

    // Rejoin room when game page loads
    socket.on('rejoinRoom', (roomCode) => {
        const result = gameService.rejoinRoom(roomCode, socket.id);
        
        if (result.success) {
            socket.join(roomCode);
            socket.roomCode = roomCode;
            console.log(`Socket ${socket.id} rejoined room: ${roomCode} - ${result.message || ''}`);
            
            // If this was a new room creation or player 2 joined, notify game ready
            if (result.message && (result.message.includes('created new room') || result.message.includes('Joined as Player 2'))) {
                io.to(roomCode).emit('gameReady', {
                    message: 'Both players connected! Make your choice.'
                });
            }
        } else {
            socket.emit('error', { message: result.error || 'Unable to rejoin room' });
        }
    });

// handle player's choice
    socket.on('makeChoice', ({ roomCode, choice }) => {
        const result = gameService.makeChoice(roomCode, socket.id, choice);

        if (result.error) {
            socket.emit('error', { message: result.error });
            return;
        }
        
        if (result.gameOver) {
// game over, send results to both players
            io.to(roomCode).emit('gameResult', {
                winner: result.winner,
                player1: result.player1,
                player2: result.player2
            });
            console.log(`Game completed in room ${roomCode}. Winner: ${result.winner}`);
        } else if (result.waiting) {
// notify the player who made the choice
            socket.emit('choiceMade', { 
                message: 'Waiting for opponent...' 
            });
        }
    });

// Play again - reset the room
    socket.on('playAgain', (roomCode) => {
        const result = gameService.resetRoom(roomCode);
        if (result.success) {
            io.to(roomCode).emit('gameReset', {
                message: 'New round started!'
            });
        } else if (result.error) {
            socket.emit('error', { message: result.error });
        }
    });

// handle disconnection
    socket.on('disconnect', () => {
        if (socket.roomCode) {
            const result = gameService.disconnection(socket.roomCode, socket.id);
            
            if (result && result.success) {
                // Room was deleted successfully
                io.to(result.roomCode).emit('playerDisconnected', {
                    message: 'Opponent disconnected'
                });
                console.log(`Room ${result.roomCode} deleted after disconnect`);
            } else if (result && result.error) {
                // Room not found or player not in room
                console.log(`Disconnect notice for room ${socket.roomCode}: ${result.error}`);
            }
        }
        console.log('User disconnected:', socket.id);
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});