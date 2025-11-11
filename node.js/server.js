// server.js
const fs = require('fs');
const http = require('http');
const path = require('path');

const server = http.createServer((req, res) => {
    const p = req.url === '/' ? '/index.html' : req.url;
    const file = path.join(__dirname, p);

    fs.readFile(file, (err, data) => {
        if (err) {
            res.writeHead(404);
            return res.end('Not found');
        }
        const ext = path.extname(file);
        const ct = ext === '.js' ? 'application/javascript' : 'text/html; charset=utf-8';
        res.writeHead(200, { 'Content-Type': ct });
        res.end(data);
    });
});

const io = require('socket.io')(server);
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

io.on('connection', (socket) => {
    console.log('Nouveau client connecté.');

    socket.on('setUsername', (username) => {
        socket.username = username;
        console.log(`${username} s'est connecté.`);
        socket.emit('message', { username: 'Serveur', message: `Bienvenue ${username} ! 👋` });
        socket.broadcast.emit('message', { username: 'Serveur', message: `🔔 ${username} vient de se connecter.` });
    });

    socket.on('message', (data) => {
        console.log(`Message de ${data.username}: ${data.message}`);
        socket.broadcast.emit('message', data);
    });

    // ✨ Indicateur de frappe
    socket.on('typing', () => {
        if (socket.username) {
            socket.broadcast.emit('typing', socket.username);
        }
    });

    socket.on('stopTyping', () => {
        if (socket.username) {
            socket.broadcast.emit('stopTyping', socket.username);
        }
    });

    socket.on('disconnect', () => {
        if (socket.username) {
            io.emit('message', { username: 'Serveur', message: `❌ ${socket.username} a quitté le chat.` });
        }
    });
});
