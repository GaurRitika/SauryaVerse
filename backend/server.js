const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const paypal = require('@paypal/checkout-server-sdk');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(express.json());
app.use(cors());

// PayPal configuration
let environment = new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET);
let client = new paypal.core.PayPalHttpClient(environment);

app.post('/api/create-paypal-order', async (req, res) => {
  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer("return=representation");
  request.requestBody({
    intent: 'CAPTURE',
    purchase_units: [{
      amount: {
        currency_code: 'USD',
        value: req.body.amount
      }
    }]
  });

  try {
    const order = await client.execute(request);
    res.json({ id: order.result.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create order.' });
  }
});

// ... (keep existing socket.io code)

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('create-room', () => {
    const roomId = generateRoomId();
    socket.join(roomId);
    socket.emit('room-created', roomId);
  });

  socket.on('join-room', (roomId) => {
    const roomClients = io.sockets.adapter.rooms.get(roomId) || { size: 0 };
    const numberOfClients = roomClients.size;

    if (numberOfClients === 0) {
      socket.emit('error', 'Room does not exist');
    } else if (numberOfClients === 1) {
      socket.join(roomId);
      socket.emit('room-joined', roomId);
      socket.to(roomId).emit('initiate_call', roomId);
    } else {
      socket.emit('error', 'Room is full');
    }
  });

  socket.on('offer', (event) => {
    console.log(`Sending offer to room ${event.roomId}`);
    socket.to(event.roomId).emit('offer', event.offer);
  });

  socket.on('answer', (event) => {
    console.log(`Sending answer to room ${event.roomId}`);
    socket.to(event.roomId).emit('answer', event.answer);
  });

  socket.on('ice-candidate', (event) => {
    console.log(`Sending ICE candidate to room ${event.roomId}`);
    socket.to(event.roomId).emit('ice-candidate', event.candidate);
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
    socket.rooms.forEach((room) => {
      if (room !== socket.id) {
        socket.to(room).emit('user-disconnected', socket.id);
      }
    });
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

function generateRoomId() {
  return Math.random().toString(36).substr(2, 9);
}
