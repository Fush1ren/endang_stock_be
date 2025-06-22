import { Server } from "socket.io";
import { notificationStockLinearLength } from "../v1/stock/stock.service";
import { StockNotification } from "../../types/stock.type";

let io: Server;

export function registerSocket(server: Server) {
  io = server;
  io.on("connection", async (socket) => {
    const notification = await notificationStockLinearLength() as StockNotification;
    emitStockNotificationLength(notification);

    socket.on('disconnect', () => {
      console.log('user disconnected');
    });
  });
}

export function emitStockNotificationLength(data: StockNotification) {
    if (io) {
        io.emit("message", data);
    }
}