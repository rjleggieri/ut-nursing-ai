import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { sessionManager } from './services/sessionManager';
import { Message } from './types/session';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

app.use(express.json());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173'
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// WebSocket connection handling
io.on('connection', (socket: Socket) => {
  console.log('Client connected:', socket.id);

  let currentSessionId: string | null = null;

  socket.on('create_session', ({ studentId, persona }: { studentId: string, persona: string }) => {
    console.log(`Received create_session request from ${socket.id} for student ${studentId}`);
    const session = sessionManager.createSession(studentId, persona);
    currentSessionId = session.id;
    socket.join(session.id);
    socket.emit('session_created', session);
    console.log(`Session created: ${session.id}, Student ${studentId} joined.`);
  });

  socket.on('join_session', ({ sessionId, facultyId }: { sessionId: string, facultyId: string }) => {
    console.log(`Received join_session request from ${socket.id} for session ${sessionId}`);
    const session = sessionManager.getSession(sessionId);
    if (session && session.active) {
      const success = sessionManager.addFacultyToSession(sessionId, facultyId);
      if (success) {
        currentSessionId = sessionId;
        socket.join(sessionId);
        socket.emit('joined_session', session);
        const messages = sessionManager.getMessages(sessionId);
        socket.emit('message_history', messages);
        console.log(`Faculty ${facultyId} joined session ${sessionId}.`);
      } else {
        socket.emit('error', { message: 'Failed to add faculty to session' });
        console.error(`Failed to add faculty ${facultyId} to session ${sessionId}.`);
      }
    } else {
      socket.emit('error', { message: 'Session not found or inactive' });
      console.error(`Attempt to join invalid session ${sessionId}.`);
    }
  });

  socket.on('send_message', (message: Message) => {
    console.log(`Received message for session ${message.sessionId}:`, message);
    const session = sessionManager.getSession(message.sessionId);
    // Add timestamp on the server before saving/broadcasting
    const messageWithTimestamp = { ...message, timestamp: new Date() };

    if (session && session.active && currentSessionId === message.sessionId) {
      sessionManager.addMessage(messageWithTimestamp); // Save message with timestamp
      // Broadcast message to everyone in the session room *including* the sender
      io.to(message.sessionId).emit('new_message', messageWithTimestamp);
      console.log(`Message broadcasted to session ${message.sessionId} including sender.`);
      
      if (messageWithTimestamp.type === 'student') {
        console.log("TODO: Trigger AI response based on student message");
      }
    } else {
      console.error(`Invalid attempt to send message to session ${message.sessionId}.`);
      socket.emit('error', { message: 'Cannot send message to this session' });
    }
  });

  socket.on('end_session', ({ sessionId }: { sessionId: string }) => {
    console.log(`Received end_session request for ${sessionId} from ${socket.id}`);
    if (currentSessionId === sessionId) {
      const success = sessionManager.endSession(sessionId);
      if (success) {
        io.to(sessionId).emit('session_ended', { sessionId });
        console.log(`Session ended: ${sessionId}`);
        currentSessionId = null;
      } else {
         console.error(`Failed to end session ${sessionId}.`);
      }
    } else {
      console.error(`Invalid attempt to end session ${sessionId}.`);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    if (currentSessionId) {
      const session = sessionManager.getSession(currentSessionId);
      if (session) {
          console.log(`Client ${socket.id} disconnected while in session ${currentSessionId}. Consider cleanup logic.`);
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 