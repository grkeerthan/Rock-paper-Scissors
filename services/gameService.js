const rooms = new Map();

//function to generate unique room code
function generateRoomCode() {
    let code = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    if (rooms.has(code))
        return generateRoomCode();
    return code;
}

//function to create a new game room
function createRoom(playerId) {
    const roomCode = generateRoomCode();
    rooms.set(roomCode, {
        code: roomCode,
        player1: {
            id: playerId,
            choice: null
        },
        player2: null,
        status: 'waiting for player'
    });
    return roomCode;
}

//function to join an existing game room
function joinRoom(roomCode, playerId) 
{
    const room = rooms.get(roomCode);

//checks if room exists or not
    if (!room) {
        return { success:false, error: "room not found" };
    }

//checks if room is already full
    if (room.player2) {
        return { success:false, error: "room full!" };
    }

//checks if player is trying to join their own room
    if (room.player1.id === playerId) {
        return { success: false, error: "already joined" };
    }

//add players to the existing room
    room.player2 = {
        id: playerId,
        choice: null
    };
    room.status = "game in progress";
    return { success: true };
}

function makeChoice(roomCode, playerId, choice) {
    const room = rooms.get(roomCode);
//checks if room exists or not
    if(!room)
    {
        return {error:"room not found"};
    }
//checks if player 1 is making the choice
    if(room.player1.id===playerId)
    {
        room.player1.choice=choice;
    }
//checks if player 2 is there and they are making the choice
    else if(room.player2 && room.player2.id===playerId)
    {
        room.player2.choice=choice;
    }
//return an error if there is one or less players in the room
    else
    {
        return {error:"player not in room"};
    }
//check if both players have made choice
    if(room.player1.choice && room.player2 && room.player2.choice)
    {
        const result = determineWinner(room.player1.choice, room.player2.choice);
        room.status = "completed";
        return{
            gameOver: true,
            winner: result,
            player1:{
                id:room.player1.id,
                choice:room.player1.choice},
            player2:    
            {
                id:room.player2.id,
                choice: room.player2.choice
            }
        };
    }
// if both players have not made choice yet return "waiting"
    return {waiting: true};
}

//function to determine the winner of the game
function determineWinner(choice1,choice2)
{
    if(choice1===choice2)
    {
        return "tie";
    }
    else if((choice1==="rock" && choice2==="scissors") ||
            (choice1==="scissors" && choice2==="paper") ||
            (choice1==="paper" && choice2==="rock"))
    {
        return "player1";
    }
    else
    {
        return "player2";
    }
}

//function to reset the room for a new game
function resetRoom(roomCode)
{
    const room = rooms.get(roomCode);
    if(!room)
    {
        return {error:"room not found"};
    }
    if (room.player1) room.player1.choice = null;
    if (room.player2) room.player2.choice = null;
    room.status = "waiting for player";
    return {success: true};
}

function disconnection(roomCode, playerId) {
    const room = rooms.get(roomCode);
    
    if (!room) {
        return { success: false, error: "Room not found" };
    }
    
    // Verify player was in the room
    const wasInRoom = room.player1.id === playerId || (room.player2 && room.player2.id === playerId);
    
    if (!wasInRoom) {
        return { success: false, error: "Player not in room" };
    }
    
    // Only delete room if both players have disconnected
    // Mark the disconnected player and check if room should be deleted
    let shouldDeleteRoom = false;
    
    if (room.player1.id === playerId) {
        room.player1.disconnected = true;
        shouldDeleteRoom = room.player2 === null || room.player2.disconnected;
    } else if (room.player2 && room.player2.id === playerId) {
        room.player2.disconnected = true;
        shouldDeleteRoom = room.player1.disconnected;
    }
    
    if (shouldDeleteRoom) {
        rooms.delete(roomCode);
        return { 
            success: true, 
            roomDeleted: true,
            roomCode: roomCode 
        };
    }
    
    return { 
        success: true, 
        roomDeleted: false,
        roomCode: roomCode 
    };
}

function rejoinRoom(roomCode, playerId) {
    let room = rooms.get(roomCode);
    
    if (!room) {
        // Room doesn't exist, create a new room with the same code
        const newRoomCode = roomCode; // Use the requested room code
        rooms.set(newRoomCode, {
            code: newRoomCode,
            player1: {
                id: playerId,
                choice: null,
                disconnected: false
            },
            player2: null,
            status: 'waiting for player'
        });
        return { success: true, roomCode: newRoomCode, message: "Room not found, created new room" };
    }
    
    // Check if player was part of this room
    const wasPlayer1 = room.player1.id === playerId;
    const wasPlayer2 = room.player2 && room.player2.id === playerId;
    
    if (wasPlayer1) {
        // Player 1 rejoined, mark as connected
        room.player1.disconnected = false;
        return { success: true, roomCode: roomCode, message: "Rejoined as Player 1" };
    } else if (wasPlayer2) {
        // Player 2 rejoined, mark as connected
        room.player2.disconnected = false;
        return { success: true, roomCode: roomCode, message: "Rejoined as Player 2" };
    } else if (!room.player2) {
        // Room exists and has space, join as player 2
        room.player2 = {
            id: playerId,
            choice: null,
            disconnected: false
        };
        room.status = "game in progress";
        return { success: true, roomCode: roomCode, message: "Joined as Player 2" };
    } else {
        // Room is full and player is not authorized
        return { success: false, error: "Room full and you're not a participant" };
    }
}

module.exports = {
    createRoom,
    joinRoom,
    makeChoice,
    resetRoom,
    disconnection,
    rejoinRoom
};