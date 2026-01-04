// Connect to Socket.io server
const socket = io();

// DOM elements
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const joinRoomForm = document.getElementById('joinRoomForm');
const roomCodeInput = document.getElementById('roomCodeInput');
const submitJoinBtn = document.getElementById('submitJoinBtn');
const cancelJoinBtn = document.getElementById('cancelJoinBtn');
const roomCreated = document.getElementById('roomCreated');
const displayRoomCode = document.getElementById('displayRoomCode');
const copyCodeBtn = document.getElementById('copyCodeBtn');
const errorMessage = document.getElementById('errorMessage');

let currentRoomCode = null;
let currentPlayerId = null;

// Create Room Button
createRoomBtn.addEventListener('click', () => {
    socket.emit('createRoom');
    showError(''); // Clear any errors
});

// Join Room Button
joinRoomBtn.addEventListener('click', () => {
    joinRoomForm.classList.remove('hidden');
    createRoomBtn.disabled = true;
    joinRoomBtn.disabled = true;
});

// Submit Join Room
submitJoinBtn.addEventListener('click', () => {
    const roomCode = roomCodeInput.value.trim().toUpperCase();
    
    if (roomCode.length !== 6) {
        showError('Please enter a 6-character room code');
        return;
    }
    
    socket.emit('joinRoom', roomCode);
    showError(''); // Clear any errors
});

// Cancel Join
cancelJoinBtn.addEventListener('click', () => {
    joinRoomForm.classList.add('hidden');
    roomCodeInput.value = '';
    createRoomBtn.disabled = false;
    joinRoomBtn.disabled = false;
    showError('');
});

// Copy Room Code
copyCodeBtn.addEventListener('click', () => {
    const code = displayRoomCode.textContent;
    navigator.clipboard.writeText(code).then(() => {
        // Visual feedback
        copyCodeBtn.textContent = '✅';
        setTimeout(() => {
            copyCodeBtn.textContent = '📋';
        }, 2000);
    });
});

// Allow Enter key to submit room code
roomCodeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        submitJoinBtn.click();
    }
});

// Auto-format room code input (uppercase)
roomCodeInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
});

// Socket Event Listeners

// Room Created
socket.on('roomCreated', (data) => {
    currentRoomCode = data.roomCode;
    currentPlayerId = data.playerId;
    
    displayRoomCode.textContent = data.roomCode;
    roomCreated.classList.remove('hidden');
    createRoomBtn.disabled = true;
    joinRoomBtn.disabled = true;
    
    // Store room code in sessionStorage
    sessionStorage.setItem('roomCode', data.roomCode);
    sessionStorage.setItem('playerId', data.playerId);
});

// Room Joined
socket.on('roomJoined', (data) => {
    currentRoomCode = data.roomCode;
    currentPlayerId = data.playerId;
    
    // Store room code in sessionStorage
    sessionStorage.setItem('roomCode', data.roomCode);
    sessionStorage.setItem('playerId', data.playerId);
    
    // Don't redirect here! Wait for gameReady event
    console.log('✅ Successfully joined room:', data.roomCode);
});

// Game Ready (both players connected)
socket.on('gameReady', (data) => {
    console.log('🎮 GAME READY EVENT RECEIVED!', data);
    window.location.href = '/game';
});

// Error handling
socket.on('error', (data) => {
    showError(data.message);
    
    // Re-enable buttons
    createRoomBtn.disabled = false;
    joinRoomBtn.disabled = false;
});

// Helper function to show error messages
function showError(message) {
    if (message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
    } else {
        errorMessage.classList.add('hidden');
    }
}

// Connection status
socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
    showError('Connection lost. Please refresh the page.');
});