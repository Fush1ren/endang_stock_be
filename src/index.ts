import express from 'express';
import config from './config';
import apiV1 from './api/v1/index.route';
import cors from "cors";
import http from 'http';
import { Server } from 'socket.io';
import { registerSocket } from './api/socket/socketInstance';
// import cookieParser from 'cookie-parser';

const app = express();

// app.use(cookieParser());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  transports: ['websocket'],
  cors: { 
    origin: config.clientUrl, 
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  },
});

/**
 * CORS configuration
 */
app.use(
    cors({
      origin: config.clientUrl, // allow CORS
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: true, // allow session cookie from browser to pass through
    })
);

app.get('/', (_req, res) => {
    res.send('Hello World!');
});

registerSocket(io);

app.use('/api/v1', apiV1);

server.listen(3000, () => {
  console.log(`Backend + Socket.IO listening on port ${config.portApi}`);
});