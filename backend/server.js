const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const config = require('./config');
const errorHandler = require('./middleware/errorHandler');
const setupSocket = require('./sockets');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors({
  origin: (origin, cb) => { cb(null, true); },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/parcels', require('./routes/parcels'));
app.use('/api/tracking', require('./routes/tracking'));
app.use('/api/carriers', require('./routes/carriers'));
app.use('/api/simulation', require('./routes/simulation'));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

setupSocket(io);

mongoose.connect(config.mongodbUri)
  .then(() => {
    console.log('Connected to MongoDB');
    server.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
