// Connect to Socket.io server
const socket = io();

// DOM elements
const gameRoomCode = document.getElementById('gameRoomCode');
const statusMessage = document.getElementById('statusMessage');
const gameArea = document.getElementById('gameArea');
const resultArea = document.getElementById('resultArea');
const choiceBtns = document.querySelectorAll('.choice-btn');
const choiceStatus = document.getElementById('choiceStatus');
const resultTitle = document.getElementById('resultTitle');
const yourChoice = document.getElementById('yourChoice');
const opponentChoice = document.getElementById('opponentChoice');
const playAgainBtn = document.getElementById('playAgainBtn');
const leaveRoomBtn = document.getElementById('leaveRoomBtn');
const errorMessage = document.getElementById('errorMessage');

// Game state
let roomCode = sessionStorage.getItem('roomCode');
let playerId = sessionStorage.getItem('playerId');
let hasChosenThisRound = false;

// Emoji mapping
const choiceEmojis = {
    rock: '🗿',
    paper: '📄',
    scissors: '✂️'
};

// Check if we have room code
if (!roomCode) {
    showError('No room code found. Redirecting...');
    setTimeout(() => {
        window.location.href = '/';
    }, 2000);
} else {
    gameRoomCode.textContent = roomCode;
    // Rejoin the Socket.io room with new socket
    socket.emit('rejoinRoom', roomCode);
    // Game is ready - show game area immediately!
    statusMessage.classList.add('hidden');
    gameArea.classList.remove('hidden');
}

// Choice button click handlers
choiceBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        if (hasChosenThisRound) {
            return; // Already made a choice
        }
        
        const choice = btn.dataset.choice;
        
        // Visual feedback
        choiceBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        
        // Emit choice to server
        socket.emit('makeChoice', { roomCode, choice });
        
        hasChosenThisRound = true;
        choiceStatus.textContent = 'Choice locked! Waiting for opponent...';
        
        // Disable all buttons
        choiceBtns.forEach(b => b.disabled = true);
    });
});

// Play Again button
playAgainBtn.addEventListener('click', () => {
    socket.emit('playAgain', roomCode);
});

// Leave Room button
leaveRoomBtn.addEventListener('click', () => {
    sessionStorage.removeItem('roomCode');
    sessionStorage.removeItem('playerId');
    window.location.href = '/';
});

// Socket Event Listeners
// (gameReady handler removed - not needed on game page!)

// Choice Made (waiting for other player)
socket.on('choiceMade', (data) => {
    choiceStatus.textContent = data.message;
});

// Game Result
socket.on('gameResult', (data) => {
    gameArea.classList.add('hidden');
    resultArea.classList.remove('hidden');
    
    // Determine if current player is player1 or player2
    const isPlayer1 = data.player1.id === playerId;
    const myChoice = isPlayer1 ? data.player1.choice : data.player2.choice;
    const theirChoice = isPlayer1 ? data.player2.choice : data.player1.choice;
    
    // Display choices
    yourChoice.textContent = choiceEmojis[myChoice];
    opponentChoice.textContent = choiceEmojis[theirChoice];
    
    // Display result
    if (data.winner === 'tie') {
        resultTitle.textContent = "It's a Tie! 🤝";
        resultTitle.style.color = '#ff9800';
    } else {
        const didIWin = (data.winner === 'player1' && isPlayer1) || 
                       (data.winner === 'player2' && !isPlayer1);
        
        if (didIWin) {
            resultTitle.textContent = 'You Win! 🎉';
            resultTitle.style.color = '#4caf50';
        } else {
            resultTitle.textContent = 'You Lose 😢';
            resultTitle.style.color = '#ff5252';
        }
    }
});

// Game Reset
socket.on('gameReset', (data) => {
    // Reset UI
    resultArea.classList.add('hidden');
    gameArea.classList.remove('hidden');
    
    // Reset choice status
    hasChosenThisRound = false;
    choiceStatus.textContent = '';
    
    // Re-enable and clear selection from all buttons
    choiceBtns.forEach(btn => {
        btn.disabled = false;
        btn.classList.remove('selected');
    });
});

// Player Disconnected
socket.on('playerDisconnected', (data) => {
    showError(data.message + '. Returning to home...');
    setTimeout(() => {
        sessionStorage.removeItem('roomCode');
        sessionStorage.removeItem('playerId');
        window.location.href = '/';
    }, 3000);
});

// Error handling
socket.on('error', (data) => {
    showError(data.message);
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
    console.log('Connected to server on game page');
    showError(''); // Clear any error messages
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
    showError('Connection lost. Please refresh the page.');
});