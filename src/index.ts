import express from 'express';
import config from './config';
import apiV1 from './api/v1/index.route';
import cors from "cors";
import http from 'http';
import { Server } from 'socket.io';
import { registerSocket } from './api/socket/socketInstance';
import cookieParser from 'cookie-parser';
// import { notificationStockLinearLength } from './api/v1/stock/stock.service';
// import { StockNotification } from './types/stock.type';

const app = express();

app.use(cookieParser());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { 
    origin: config.clientUrl, 
    credentials: true }
  ,
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

// io.on('connection', async (socket) => {
//   console.log('a user connected');
//   const notification = await notificationStockLinearLength() as StockNotification;
//   io.emit('message', notification);

//   socket.on('disconnect', () => {
//     console.log('user disconnected');
//   });
// });

// app.listen(3000, () => {
//     console.log(`Backend stock app listening on port ${config.portApi}`);
// });

server.listen(3000, () => {
  console.log(`Backend + Socket.IO listening on port ${config.portApi}`);
});