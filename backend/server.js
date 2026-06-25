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

const allowedOrigins = [
  config.clientUrl,
  process.env.PUBLIC_CLIENT_URL,
  'https://projectaura72-ops.github.io',
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
};

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`Origin ${origin} not allowed by Socket.IO CORS`));
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(cors(corsOptions));
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
