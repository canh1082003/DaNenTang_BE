// src/socket.ts
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { Application } from 'express';
import jwt from 'jsonwebtoken';
import Message from './databases/entities/Message';
import User from './databases/entities/User';
import Conversation from './databases/entities/Conversation';
import { platformState } from './init/ngrokMonitor';
let io: SocketIOServer;
export const clientMap = new Map<string, string>();
export const setupSocket = (server: HTTPServer, app: Application) => {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
    },
  });

  app.set('io', io);
  io.on('connection', (socket) => {
    try {
      const payload = jwt.verify(
        socket.handshake.auth.token as string,
        process.env.JWT_SECRET as string
      );
      const userId = (payload as { id: string }).id;
      clientMap.set(userId, socket.id);
      console.log('Client connected:', socket.id, payload);
    

      socket.broadcast.emit('userOnline', {
        userId,
        timestamp: new Date().toISOString(),
      });

      socket.on('setup', (id: string) => {
        if (id && id === userId) {
          void socket.join(userId);
        }
        socket.emit('platform-status', {
          name: 'Facebook',
          status: platformState.Facebook,
        });
        socket.emit('platform-status', {
          name: 'Telegram',
          status: platformState.Telegram,
        });
        console.log('Cline connect Telegram and Facebook success');
      });

      socket.on('joinRoom', (conversationId: string) => {
        void socket.join(conversationId);
      });

      socket.on('markAsRead', async (conversationId: string) => {
        try {
          if (!conversationId) {
            return;
          }
          await Message.updateMany(
            { conversation: conversationId, readBy: { $ne: userId } },
            { $addToSet: { readBy: userId } }
          );
          await Conversation.findByIdAndUpdate(conversationId, {
            $set: { [`lastReads.${userId}`]: new Date() },
          });

          const payload = {
            conversationId,
            userId,
            at: new Date().toISOString(),
          };
          // Notify all clients in the room and the user's personal room
          io.to(conversationId).emit('readReceipt', payload);
          io.to(userId).emit('readReceipt', payload);
        } catch (error) {
          console.error('markAsRead error:', error);
        }
      });

      socket.on('disconnect', async () => {
        clientMap.delete(userId);
        console.log('Client disconnected:', socket.id);
        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen: new Date(),
        });
        // Emit user offline status to all clients
        socket.broadcast.emit('userOffline', {
          userId,
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error) {
      console.error('Error during socket connection:', error);
      socket.disconnect();
    }
  });
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};
