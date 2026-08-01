const WebSocket = require('ws');
const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

const rooms = {};

wss.on('connection', (ws) => {
    let currentRoom = null;
    let myRole = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            if (data.type === 'create') {
                currentRoom = data.roomId;
                myRole = 'host';
                rooms[currentRoom] = { host: ws, guest: null };
                ws.send(JSON.stringify({ type: 'created', roomId: currentRoom }));
            } 
            else if (data.type === 'join') {
                currentRoom = data.roomId;
                if (rooms[currentRoom]) {
                    myRole = 'guest';
                    rooms[currentRoom].guest = ws;
                    ws.send(JSON.stringify({ type: 'joined', roomId: currentRoom }));
                    if (rooms[currentRoom].host) {
                        rooms[currentRoom].host.send(JSON.stringify({ type: 'player_joined' }));
                    }
                } else {
                    ws.send(JSON.stringify({ type: 'error', message: 'Комната не найдена' }));
                }
            } 
            else if (data.type === 'game_data') {
                if (currentRoom && rooms[currentRoom]) {
                    const target = myRole === 'host' ? rooms[currentRoom].guest : rooms[currentRoom].host;
                    if (target && target.readyState === WebSocket.OPEN) {
                        target.send(JSON.stringify({ type: 'game_data', payload: data.payload }));
                    }
                }
            }
        } catch (e) { console.error(e); }
    });

    ws.on('close', () => {
        if (currentRoom && rooms[currentRoom]) {
            if (myRole === 'host') {
                if (rooms[currentRoom].guest) rooms[currentRoom].guest.send(JSON.stringify({ type: 'peer_disconnected' }));
                delete rooms[currentRoom];
            } else if (myRole === 'guest') {
                if (rooms[currentRoom].host) rooms[currentRoom].host.send(JSON.stringify({ type: 'peer_disconnected' }));
                rooms[currentRoom].guest = null;
            }
        }
    });
});

console.log(`Сервер запущен на порту ${PORT}`);
