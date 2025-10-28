// server.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;

// serve static client
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Broadcast helper
function broadcast(data, sender) {
  const raw = JSON.stringify(data);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN && client !== sender) {
      client.send(raw);
    }
  }
}

wss.on('connection', (ws, req) => {
  console.log('New client connected:', req.socket.remoteAddress);

  // Optionally send a welcome with assigned id/time
  const welcome = { type: 'system', text: 'Welcome to the chat!' };
  ws.send(JSON.stringify(welcome));

  ws.on('message', (msg) => {
    let payload;
    try {
      payload = JSON.parse(msg);
    } catch (e) {
      // If not JSON, wrap as text
      payload = { type: 'message', text: String(msg) };
    }

    // Attach server timestamp and broadcast
    const out = {
      ...payload,
      ts: new Date().toISOString()
    };

    // Echo back to sender as ack
    ws.send(JSON.stringify({ type: 'ack', ts: out.ts }));

    // Broadcast to others
    broadcast(out, ws);
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });

  ws.on('error', (err) => {
    console.error('WS error:', err);
  });
});

server.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
