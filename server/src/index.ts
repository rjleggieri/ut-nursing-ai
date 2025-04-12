import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
// Import the singleton instance
import { sessionManager } from './services/sessionManager'; 
// Import types directly from their source
import { PersonaData, Message } from './types/session'; 
import { startSttStream, sendAudioToStt, closeSttStream } from './services/humeService';
import { Hume } from 'hume';
// Import CloseEvent for the close handler
import { CloseEvent } from 'ws'; 

dotenv.config();

const app = express();
const httpServer = createServer(app);

const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'; // Default to common React dev port
console.log(`Allowing connections from client URL: ${clientUrl}`);

const io = new Server(httpServer, {
  cors: {
    origin: clientUrl,
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket: Socket) => {
  console.log(`[index.ts] Client connected: ${socket.id}`);
  // Use a map to track session associated with THIS specific socket connection
  // This replaces the single currentSessionId variable
  const socketSessionMap = new Map<string, string>(); 

  // --- Hume Service Callback Handlers ---
  // These handlers will be passed to startSttStream and need the sessionId
  // They use 'io.to(sessionId)' to broadcast to all sockets in the session room

  const handleTranscription = (sessionId: string, result: { text: string; isFinal: boolean }) => {
    // Log 1: Log the received result
    console.log(`[handleTranscription] Received result for ${sessionId}:`, JSON.stringify(result)); 

    io.to(sessionId).emit('transcriptionUpdate', result); 
    if (result.isFinal && result.text.trim()) {
       // Log 2: Log if condition is met
       console.log(`[handleTranscription] Condition met (isFinal=true, text exists) for ${sessionId}`);
       const session = sessionManager.getSession(sessionId);
       if (session) { 
           const message: Message = {
               sessionId: sessionId,
               senderId: session.studentId,
               content: result.text,   
               type: 'transcription',
               timestamp: new Date()
           };
           sessionManager.addMessage(message);
           // *** Emit the new message to the room ***
           io.to(sessionId).emit('new_message', message);
           console.log(`[index.ts] Emitted new_message (transcription) to room ${sessionId}`);
       } else {
           console.error(`Cannot save transcription message: Session not found for ID ${sessionId}`);
       }
    } 
    // Log 3: Log if condition is NOT met
    else {
        console.log(`[handleTranscription] Condition NOT met for ${sessionId} (isFinal=${result.isFinal}, text=${result.text.trim() ? 'exists' : 'empty'})`);
    }
  };

  const handleAssistantMessage = (sessionId: string, messageEvent: Hume.empathicVoice.AssistantMessage) => {
      console.log(`Assistant Message for ${sessionId}:`, messageEvent.message.content);
      // Emit the assistant's text message to the client
      io.to(sessionId).emit('assistantMessage', { 
          text: messageEvent.message.content, 
      });
      // Save assistant message to session history
      const message: Message = {
          sessionId: sessionId,
          senderId: 'HUME_AI', 
          content: messageEvent.message.content ?? '',
          type: 'ai',
          timestamp: new Date() 
      };
      sessionManager.addMessage(message);
      // *** Emit the new message to the room ***
      io.to(sessionId).emit('new_message', message);
      console.log(`[index.ts] Emitted new_message (ai) to room ${sessionId}`);
  };

  const handleAudioOutput = (sessionId: string, audioBuffer: Buffer) => {
      // console.log(`Received Audio Output chunk for ${sessionId}, size: ${audioBuffer.length}`);
      // Forward the raw audio buffer to the client
      io.to(sessionId).emit('audioOutput', audioBuffer);
  };

  const handleHumeError = (sessionId: string, error: Error) => {
      console.error(`Hume EVI Error for session ${sessionId}:`, error);
      // Notify the client about the error
      io.to(sessionId).emit('humeError', { message: error.message || 'Unknown Hume error' });
      // Optionally, try to close the stream or take other recovery actions
      closeSttStream(sessionId); 
  };
  
  const handleHumeClose = (sessionId: string, event: CloseEvent) => {
      const code = event.code;
      // Reason might be a Buffer or string depending on WebSocket library/event
      // Use toString() for safer logging
      const reason = event.reason?.toString() || 'No reason given'; 
      console.log(`Hume EVI connection closed for session ${sessionId}. Code: ${code}, Reason: ${reason}`);
      // Notify the client, maybe?
      io.to(sessionId).emit('humeClose', { code, reason });
      console.log(`[index.ts] Hume EVI connection closed event handled for session ${sessionId}.`);
  };

  // --- Socket Event Handlers ---

  socket.on('create_session', async ({ studentId, personaData }: { studentId: string, personaData: PersonaData }) => {
    console.log(`[index.ts] Received create_session from ${socket.id}`);
    // Check if this socket is already associated with a session
    if (socketSessionMap.has(socket.id)) {
        console.warn(`[index.ts] Socket ${socket.id} requested create_session but is already in session ${socketSessionMap.get(socket.id)}. Ignoring.`);
        // Optionally, send an error back to the client
        socket.emit('error', { message: 'Socket already associated with an active session.' });
        return;
    }
    try {
      // Ensure personaData is valid and system_prompt exists (or handle if optional)
      if (!personaData || typeof personaData.system_prompt !== 'string') {
        console.error(`[index.ts] Invalid or missing personaData/system_prompt for create_session from ${socket.id}`);
        socket.emit('error', { message: 'Invalid persona data provided.' });
        return;
      }

      const session = sessionManager.createSession(studentId, personaData);
      socketSessionMap.set(socket.id, session.id); // Associate this socket with the new session ID
      socket.join(session.id); 
      socket.emit('session_created', session);
      console.log(`[index.ts] Session ${session.id} created. Socket ${socket.id} associated and joined room.`);
      
      // *** Extract config_id ***
      const configId = personaData.config_id; 

      // *** Check if configId exists before starting stream ***
      if (configId) {
          await startSttStream(
              session.id, 
              configId, // Pass the config ID
              (result) => handleTranscription(session.id, result),
              (message) => handleAssistantMessage(session.id, message),
              (audioBuffer) => handleAudioOutput(session.id, audioBuffer),
              (error) => handleHumeError(session.id, error),
              (event) => handleHumeClose(session.id, event)
          );
          console.log(`[index.ts] Hume EVI stream initiated for session ${session.id} using configId: ${configId}.`);
      } else {
          console.warn(`[index.ts] No config_id found for persona ${personaData.id}. Hume EVI stream NOT initiated for session ${session.id}.`);
          // Optionally emit an event to the client indicating EVI is not available for this persona
          socket.emit('humeError', { message: `Voice interaction is not configured for the selected persona (${personaData.name}).` });
      }
      
    } catch (error: any) {
      console.error("[index.ts] Failed to create session:", error);
      socket.emit('error', { message: `Failed to create session: ${error.message || 'Unknown error'}` });
      socketSessionMap.delete(socket.id);
    }
  });

  socket.on('join_session', async ({ sessionId, facultyId }: { sessionId: string, facultyId: string }) => {
    console.log(`[index.ts] Received join_session from ${socket.id} for session ${sessionId}`);
    // Check if this socket is already associated with a session
    if (socketSessionMap.has(socket.id)) {
        console.warn(`[index.ts] Socket ${socket.id} requested join_session but is already in session ${socketSessionMap.get(socket.id)}. Ignoring.`);
        socket.emit('error', { message: 'Socket already associated with an active session.' });
        return;
    }
    const session = sessionManager.getSession(sessionId);
    if (session && session.active && session.personaData) {
      // *** Attempt to add faculty ***
      console.log(`[index.ts] Attempting to add faculty ${facultyId} to session ${sessionId}`);
      const added = sessionManager.addFacultyToSession(sessionId, facultyId);
      console.log(`[index.ts] sessionManager.addFacultyToSession result: ${added}`);

      // *** Original logic (only proceed if added is technically true, but we might want to allow re-join) ***
      // For now, let's log if added is false but proceed anyway
      if (!added) {
          console.warn(`[index.ts] Faculty ${facultyId} could not be added (may already be listed or session inactive). Allowing join attempt anyway.`);
      }

      // Associate socket and join room regardless of addFaculty result (allowing re-join)
      socketSessionMap.set(socket.id, sessionId); // Associate this socket
      socket.join(sessionId);
      console.log(`[index.ts] Socket ${socket.id} associated with session ${sessionId} and joined room.`);
      
      // *** Log current room members ***
      const roomMembers = io.sockets.adapter.rooms.get(sessionId);
      console.log(`[index.ts] Current members in room ${sessionId}:`, roomMembers ? Array.from(roomMembers) : 'None');

      // Emit joined session and message history
      socket.emit('joined_session', session);
      const messages = sessionManager.getMessages(sessionId);
      socket.emit('message_history', messages); 
      console.log(`[index.ts] Emitted joined_session and message_history to faculty ${facultyId}.`);

      const configId = session.personaData.config_id;
      if (configId) {
           await startSttStream(
              sessionId, 
              configId, // Pass the config ID
              (result) => handleTranscription(sessionId, result),
              (message) => handleAssistantMessage(sessionId, message),
              (audioBuffer) => handleAudioOutput(sessionId, audioBuffer),
              (error) => handleHumeError(sessionId, error),
              (event) => handleHumeClose(sessionId, event)
          );
          console.log(`[index.ts] Hume EVI stream ensured/initiated for session ${sessionId} using configId: ${configId} after faculty join.`);
      } else {
          // Log warning, stream was likely not started initially either, or persona has no config.
           console.warn(`[index.ts] No config_id found for persona ${session.personaData.id} in session ${sessionId}. Hume EVI stream NOT initiated for joining faculty.`);
           // Optionally notify joining faculty
           socket.emit('humeError', { message: `Voice interaction is not configured for this session's persona (${session.personaData.name}).` });
      }

    } else {
      socket.emit('error', { message: 'Session not found or inactive' });
      console.error(`[index.ts] Attempt by ${socket.id} to join invalid session ${sessionId}.`);
      if (!session?.personaData) {
            console.error(`[index.ts] Cannot ensure Hume stream for faculty join: PersonaData missing in session ${sessionId}.`);
       }
    }
  });

  socket.on('send_message', (message: Message) => {
    const currentSessionId = socketSessionMap.get(socket.id);
    console.log(`[index.ts] Received message from ${socket.id} for session ${message.sessionId}. Socket thinks it's in: ${currentSessionId}`);
    if (!currentSessionId || currentSessionId !== message.sessionId) {
        console.error(`[index.ts] Message session ID ${message.sessionId} does not match socket's associated session ${currentSessionId}. Ignoring.`);
        socket.emit('error', { message: 'Session ID mismatch.' });
        return;
    }
    const session = sessionManager.getSession(currentSessionId);
    const messageWithTimestamp = { ...message, timestamp: new Date() };

    if (session && session.active) {
      sessionManager.addMessage(messageWithTimestamp); 
      io.to(currentSessionId).emit('new_message', messageWithTimestamp);
      console.log(`[index.ts] Message broadcasted to session ${currentSessionId}.`);
    } else {
      console.error(`[index.ts] Invalid attempt to send message to inactive/invalid session ${currentSessionId}.`);
      socket.emit('error', { message: 'Cannot send message to this session' });
    }
  });

  // Handle voice input chunks from student/faculty
  // *** Expect encodedAudioData string ***
  socket.on('VOICE_INPUT', ({ sessionId, encodedAudioData }: { sessionId: string, encodedAudioData: string }) => {
      const currentSessionId = socketSessionMap.get(socket.id);
      if (!currentSessionId || currentSessionId !== sessionId) {
          console.warn(`[index.ts] VOICE_INPUT session ID ${sessionId} does not match socket's associated session ${currentSessionId}. Ignoring.`);
          return;
      }
      // *** Remove Buffer conversion, pass string ***
      if (typeof encodedAudioData !== 'string' || encodedAudioData.length === 0) {
          console.warn(`[index.ts] Received invalid or empty encodedAudioData for session ${currentSessionId}. Ignoring.`);
          return;
      }
      // console.log(`[index.ts] Forwarding encoded audio data (${encodedAudioData.length} chars) for session ${currentSessionId}`);
      sendAudioToStt(currentSessionId, encodedAudioData); 
  });

  socket.on('end_session', ({ sessionId }: { sessionId: string }) => {
    console.log(`[index.ts] Received 'end_session' from socket ${socket.id} for session: ${sessionId}`); // Log received
    try {
        const session = sessionManager.getSession(sessionId);
        if (session) {
            console.log(`[index.ts] Found session ${sessionId}. Attempting to end.`); // Log found
            sessionManager.endSession(sessionId);
            console.log(`[index.ts] Called sessionManager.endSession for ${sessionId}.`); // Log end call
            closeSttStream(sessionId);
            console.log(`[index.ts] Called closeSttStream for ${sessionId}.`); // Log close call
            // Broadcast session ended to ALL clients in the room
            io.to(sessionId).emit('session_ended', { sessionId });
            console.log(`[index.ts] Emitted 'session_ended' to room ${sessionId}.`); // Log emit
            
            // *** Remove socket association from the map ***
            socketSessionMap.delete(socket.id);
            console.log(`[index.ts] Disassociated socket ${socket.id} from ended session ${sessionId}.`);

        } else {
             console.warn(`[index.ts] Received end_session for non-existent/inactive session ID: ${sessionId} from socket ${socket.id}`);
        }
    } catch (error: any) {
        console.error(`[index.ts] Error during end_session for ${sessionId}:`, error);
        socket.emit('error', { message: `Error ending session: ${error.message || 'Unknown error'}` });
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`[index.ts] Client disconnected: ${socket.id}. Reason: ${reason}`);
    // Find which session this socket was associated with
    const sessionId = socketSessionMap.get(socket.id);
    if (sessionId) {
        console.log(`[index.ts] Socket ${socket.id} was in session ${sessionId}. Cleaning up association.`);
        // Log map BEFORE removal
        // console.log('[index.ts] socketSessionMap BEFORE removal:', JSON.stringify(Array.from(socketSessionMap.entries())));
        
        // Remove the specific socket from the map
        const deleted = socketSessionMap.delete(socket.id);
        // console.log(`[index.ts] Attempted to delete socket ${socket.id} from map. Success: ${deleted}`);
        
        // Log map AFTER removal
        // console.log('[index.ts] socketSessionMap AFTER removal:', JSON.stringify(Array.from(socketSessionMap.entries())));

        // Check session status AFTER removing the socket from the map
        const session = sessionManager.getSession(sessionId);
        if (session) {
            console.log(`[index.ts] Session ${sessionId} status after socket removal: active=${session.active}`);
            // Check if the disconnected user was the student - FOR LOGGING ONLY
             if (session.studentId === socket.id) { 
                 console.log(`[index.ts] Log: Disconnected socket ${socket.id} was the student.`);
             } else {
                 console.log(`[index.ts] Log: Disconnected socket ${socket.id} was likely faculty.`);
                 // *** Call removeFacultyFromSession ***
                 // NOTE: Using socket.id as a placeholder for facultyId - Needs improvement
                 sessionManager.removeFacultyFromSession(sessionId, socket.id); 
             }
        } else {
            console.warn(`[index.ts] Session ${sessionId} not found in sessionManager after socket ${socket.id} disconnect.`);
        }

        // *** CRITICAL: DO NOT close Hume stream on simple disconnect ***
        // closeSttStream(sessionId); 

    } else {
        console.log(`[index.ts] Disconnected socket ${socket.id} was not associated with any active session.`);
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 