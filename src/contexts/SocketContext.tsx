import React, { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import { PersonaData } from '@/types/persona'; // Import PersonaData type
import { toast } from '@/lib/toast';
// Use relative path for session types
import { Message as IMessage, Session as ISession } from '../types/session'; // Import Session as ISession

// *** Update Message type to include transcription ***
export interface ClientMessage extends Omit<IMessage, 'type'> {
    type: 'student' | 'ai' | 'faculty' | 'transcription';
}

// Re-export Session type for convenience
export type { ISession as Session };
// *** Use updated ClientMessage internally ***

interface SocketContextProps {
  socket: Socket | null;
  isConnected: boolean;
  session: ISession | null; 
  messages: ClientMessage[]; // Use ClientMessage
  createSession: (studentId: string, personaData: PersonaData) => void;
  joinSession: (sessionId: string, facultyId: string) => void;
  endSession: () => void;
  sendMessage: (message: Omit<ClientMessage, 'timestamp' | 'sessionId' | 'type'> & { type: 'student' | 'faculty' }) => void; // Adjust sendMessage type
  transcription: string;
  isTranscriptionFinal: boolean;
  assistantResponse: string; 
}

const SocketContext = createContext<SocketContextProps | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [session, setSession] = useState<ISession | null>(null);
  const [messages, setMessages] = useState<ClientMessage[]>([]); // Use ClientMessage
  const [isConnected, setIsConnected] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [isTranscriptionFinal, setIsTranscriptionFinal] = useState(false);
  const [assistantResponse, setAssistantResponse] = useState('');

  // --- Audio Playback State ---
  const audioQueueRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const currentAudioUrlRef = useRef<string | null>(null); 
  const isPlayingRef = useRef(isPlaying);
  // *** Ref to hold the current session object ***
  const sessionRef = useRef<ISession | null>(session); // Use ISession internally

  useEffect(() => {
      isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // *** Keep sessionRef synced with session state ***
  useEffect(() => {
    sessionRef.current = session;
  }, [session]); // Depends on internal session state (ISession)

  // --- Audio Playback Logic ---
  const stopPlayback = useCallback(() => {
    console.log("[AudioPlayback] Stopping playback.");
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.onended = null; // Remove listener
      currentAudioRef.current = null;
    }
    if (currentAudioUrlRef.current) {
      URL.revokeObjectURL(currentAudioUrlRef.current);
      currentAudioUrlRef.current = null;
    }
    audioQueueRef.current = []; // Clear the queue
    setIsPlaying(false);
  }, []);

  const playNextInQueue = useCallback(() => {
    if (!isPlayingRef.current && audioQueueRef.current.length === 0) {
        return;
    }
    if (audioQueueRef.current.length === 0) {
      console.log(`[AudioPlayback] Queue empty. Setting isPlaying=false.`);
      setIsPlaying(false);
      return;
    }
    
    if (!isPlayingRef.current) {
        setIsPlaying(true);
    }
    const audioBlob = audioQueueRef.current.shift();
    
    if (!audioBlob) {
      console.error("[AudioPlayback] Dequeued undefined blob.");
      setIsPlaying(false);
      return;
    }

    console.log(`[AudioPlayback] Playing next chunk. Queue size BEFORE playing: ${audioQueueRef.current.length + 1}`);

    if (currentAudioUrlRef.current) {
        URL.revokeObjectURL(currentAudioUrlRef.current);
    }

    const audioUrl = URL.createObjectURL(audioBlob);
    currentAudioUrlRef.current = audioUrl;
    const audio = new Audio(audioUrl);
    currentAudioRef.current = audio;

    audio.onended = () => {
      console.log(`[AudioPlayback] Chunk finished. Queue size: ${audioQueueRef.current.length}`);
      currentAudioRef.current = null; 
      if (currentAudioUrlRef.current) {
          URL.revokeObjectURL(currentAudioUrlRef.current);
          currentAudioUrlRef.current = null;
      }
      if (audioQueueRef.current.length > 0) {
          console.log("[AudioPlayback] Queue not empty, calling playNextInQueue recursively.");
          playNextInQueue();
      } else {
          console.log("[AudioPlayback] Queue is now empty after chunk finished. Setting isPlaying=false.");
          setIsPlaying(false);
      }
    };

    audio.onerror = (e) => {
        console.error("[AudioPlayback] Error playing audio chunk:", e);
        stopPlayback();
    };

    audio.play().catch(error => {
        console.error("[AudioPlayback] audio.play() failed:", error);
        stopPlayback(); 
    });

  }, [stopPlayback]);

  // --- Socket Connection and Event Handlers ---
  useEffect(() => {
    const serverUrl = import.meta.env.VITE_WS_SERVER_URL || 'http://localhost:3001';
    const newSocket = io(serverUrl);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setIsConnected(true);
      toast.success("Connected to server");
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
      setSession(null); // Clear session on disconnect
      setMessages([]);
      setTranscription('');
      setIsTranscriptionFinal(false);
      setAssistantResponse('');
      stopPlayback(); // Stop audio playback on disconnect
      toast.error("Disconnected", { description: `Server connection lost: ${reason}` });
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection Error:', error);
      setIsConnected(false);
      toast.error("Connection Error", { description: error.message });
    });

    // --- Session Management Events ---
    newSocket.on('session_created', (newSession: ISession) => { // Use ISession internally
      console.log('Session created on server:', newSession);
      setSession(newSession);
      setMessages([]); // Clear messages for new session
      setTranscription('');
      setIsTranscriptionFinal(false);
      setAssistantResponse('');
      stopPlayback(); // Ensure any previous playback is stopped
    });

    newSocket.on('joined_session', (joinedSession: ISession) => { // Use ISession internally
      console.log('Joined session on server:', joinedSession);
      setSession(joinedSession);
      // Messages might be loaded via message_history
    });

    newSocket.on('session_ended', ({ sessionId }: { sessionId: string }) => {
      console.log(`[SocketContext] Received 'session_ended' event for: ${sessionId}`); // Log received event
      if (sessionRef.current?.id === sessionId) {
        console.log(`[SocketContext] Matched active session. Clearing session state.`); // Log state clear
        setSession(null);
        setMessages([]);
        setTranscription('');
        setIsTranscriptionFinal(false);
        setAssistantResponse('');
        stopPlayback(); // Stop audio playback
      }
    });
    
    newSocket.on('message_history', (history: ClientMessage[]) => { // Use ClientMessage
        console.log(`Received message history (${history.length} messages)`);
        setMessages(history);
    });

    // Ensure the event name matches exactly what the server emits
    const newMessageEventName = 'new_message'; 
    newSocket.on(newMessageEventName, (message: ClientMessage) => { // Use ClientMessage
      console.log(`[SocketContext] Received '${newMessageEventName}':`, message);
      setMessages(currentMessages => {
          console.log(`[SocketContext] Updating messages. Current length: ${currentMessages.length}, New message type: ${message.type}`);
          return [...currentMessages, message];
      });
    });

    // --- Hume EVI Events ---
    newSocket.on('transcriptionUpdate', (data: { text: string; isFinal: boolean }) => {
      // console.log('Transcription Update:', data);
      setTranscription(data.text);
      setIsTranscriptionFinal(data.isFinal);
      // If user starts speaking (even interim transcription), stop assistant playback
      stopPlayback();
    });

    newSocket.on('assistantMessage', (data: { text: string }) => {
        console.log('Assistant Message Text:', data.text);
        setAssistantResponse(data.text);
        // We might receive message before audio, or vice-versa.
        // Playback is handled by audioOutput.
    });

    newSocket.on('audioOutput', (audioBuffer: ArrayBuffer) => {
      const blob = new Blob([audioBuffer], { type: 'audio/wav' }); 
      audioQueueRef.current.push(blob);
      console.log(`[AudioPlayback] Audio chunk received & enqueued. Queue size: ${audioQueueRef.current.length}. isPlaying: ${isPlayingRef.current}`);
      if (!isPlayingRef.current) {
          console.log("[AudioPlayback] Not currently playing, calling playNextInQueue.");
          playNextInQueue();
      }
    });

    newSocket.on('user_interruption', () => {
        console.log("[Interruption] User interruption detected by Hume.");
        stopPlayback();
    });

    newSocket.on('humeError', (error: { message: string }) => {
        console.error("Hume Error Received:", error);
        toast.error("Hume Error", { description: error.message || "An unspecified error occurred in Hume EVI." });
        stopPlayback(); // Stop playback on Hume errors too
    });
    
    newSocket.on('humeClose', (data: { code: number; reason: string }) => {
        console.log(`Hume Connection Closed: Code ${data.code}, Reason: ${data.reason}`);
        stopPlayback(); // Stop playback if Hume connection closes
    });
    
    // General error handling
    newSocket.on('error', (error: { message: string }) => {
      console.error('Socket Error:', error);
      toast.error("Server Error", { description: error.message || 'An unknown error occurred' });
    });

    return () => {
      console.log('Disconnecting socket...');
      stopPlayback(); // Ensure cleanup on unmount
      newSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
      setSession(null);
      setMessages([]);
      setTranscription('');
      setIsTranscriptionFinal(false);
      setAssistantResponse('');
    };
  }, [stopPlayback, playNextInQueue]);

  // --- Context Actions ---
  const createSession = useCallback((studentId: string, personaData: PersonaData) => {
    if (socket && isConnected) {
      console.log('Context: Emitting create_session', { studentId, personaId: personaData.id });
      // Send full persona data object
      socket.emit('create_session', { studentId, personaData }); 
    } else {
      toast.error("Cannot create session", { description: "Not connected to server." });
    }
  }, [socket, isConnected]);

  const joinSession = useCallback((sessionId: string, facultyId: string) => {
    if (socket && isConnected) {
      console.log('Context: Emitting join_session', { sessionId, facultyId });
      socket.emit('join_session', { sessionId, facultyId });
    } else {
      toast.error("Cannot join session", { description: "Not connected to server." });
    }
  }, [socket, isConnected]);

  const endSession = useCallback(() => {
    if (socket && isConnected && session) {
      console.log(`[SocketContext] Attempting to end session: ${session.id}`); // Log attempt
      // Optional: Set a local state like isEndingSession(true) here if needed for UI
      socket.emit('end_session', { sessionId: session.id });
      console.log(`[SocketContext] Emitted 'end_session' for session: ${session.id}`); // Log emit
    } else {
      console.warn('[SocketContext] Cannot end session: No socket, not connected, or no active session.');
      toast.error("Cannot end session", { description: "Not connected or no active session." });
    }
  }, [socket, isConnected, session]);

  // Adjust sendMessage to accept specific types
  const sendMessage = useCallback((messageData: Omit<ClientMessage, 'timestamp' | 'sessionId' | 'type'> & { type: 'student' | 'faculty' }) => {
    if (socket && session) { 
      // Type assertion needed here because the function signature guarantees type
      const messageToSend = { ...messageData, sessionId: session.id } as ClientMessage;
      console.log('Context: Emitting send_message', messageToSend);
      socket.emit('send_message', messageToSend);
    } else {
      toast.error("Cannot send message", { description: "Not connected or no active session." });
    }
  }, [socket, session]);

  const contextValue: SocketContextProps = {
    socket,
    session,
    messages,
    isConnected,
    createSession,
    joinSession,
    endSession,
    sendMessage,
    transcription,
    isTranscriptionFinal,
    assistantResponse,
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

// Custom hook to use the SocketContext
export const useSocket = (): SocketContextProps => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}; 