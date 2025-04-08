import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { PersonaData } from '@/types/persona'; // Import PersonaData type
// Define types locally instead of importing from server
// Duplicating these types is acceptable for decoupling frontend/backend

export interface Session {
  id: string;
  studentId: string;
  persona: string;
  startTime: Date; // Note: Date objects might not serialize perfectly over socket.io, consider strings
  active: boolean;
  connectedFaculty: string[];
}

export interface Message {
  type: 'student' | 'ai' | 'faculty';
  content: string;
  timestamp: Date | string; // Use string if Date serialization is an issue
  sessionId: string;
  senderId: string; 
}

interface SocketContextType {
  socket: Socket | null;
  session: Session | null;
  messages: Message[];
  isConnected: boolean;
  createSession: (studentId: string, personaData: PersonaData) => void;
  joinSession: (sessionId: string, facultyId: string) => void;
  sendMessage: (message: Omit<Message, 'timestamp' | 'senderId'>) => void; // Let backend set timestamp/sender
  endSession: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const serverUrl = import.meta.env.VITE_WS_SERVER_URL || 'http://localhost:3001';
    const newSocket = io(serverUrl);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
      setSession(null); // Reset session on disconnect
      setMessages([]);
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setIsConnected(false);
    });

    // --- Session Listeners ---
    newSocket.on('session_created', (createdSession: Session) => {
      console.log('Session created on server:', createdSession);
      setSession(createdSession);
      setMessages([]); // Clear messages for new session
    });

    newSocket.on('joined_session', (joinedSession: Session) => { 
      console.log(`Context: Successfully joined session: ${joinedSession.id}`);
      setSession(joinedSession); // Set the session state
      // Message history is handled by its own listener
    });

    newSocket.on('message_history', (history: Message[]) => {
      console.log('Received message history:', history);
      setMessages(history);
    });

    newSocket.on('new_message', (newMessage: Message) => {
      console.log('Received new message:', newMessage);
      setMessages((prevMessages) => [...prevMessages, newMessage]);
    });

    newSocket.on('session_ended', ({ sessionId: endedSessionId }: { sessionId: string }) => {
      console.log(`Session ended on server: ${endedSessionId}`);
      // Use functional update to ensure we check against the latest state
      setSession(prevSession => { 
        if (prevSession?.id === endedSessionId) {
          console.log(`Context: Clearing session state for ${endedSessionId}`);
          setMessages([]); // Also clear messages when session ends
          return null; // Return null to update the state
        }
        // If the ended session ID doesn't match the current session, do nothing
        console.log(`Context: Ignoring session_ended for ${endedSessionId} (current session: ${prevSession?.id})`);
        return prevSession; // Keep the existing state
      });
    });
    
    newSocket.on('error', (error: { message: string }) => {
      console.error('Server error:', error.message);
      // Display error to user?
    });

    return () => {
      newSocket.disconnect();
    };
  }, []); // Run only once on mount

  // --- Emitter Functions ---
  const createSession = (studentId: string, personaData: PersonaData) => {
    console.log("Context: Emitting create_session", { studentId, personaId: personaData?.id });
    socket?.emit('create_session', { studentId, personaData });
  };

  const joinSession = (sessionId: string, facultyId: string) => {
    socket?.emit('join_session', { sessionId, facultyId });
  };

  const sendMessage = (messageData: Omit<Message, 'timestamp' | 'senderId'>) => {
    if (session && socket) {
      const messageToSend = {
        ...messageData,
        sessionId: session.id,
        // senderId will be implicitly known by the server via socket.id or added later
      };
      socket.emit('send_message', messageToSend);
      // Add message optimistically to local state? Or wait for broadcast?
      // For now, we wait for broadcast via 'new_message' listener
      // setMessages((prev) => [...prev, { ...messageToSend, timestamp: new Date(), senderId: '???' }]);
    }
  };

  const endSession = () => {
    if (session && socket) {
      socket.emit('end_session', { sessionId: session.id });
      // State will be cleared by the 'session_ended' listener
    }
  };

  const contextValue: SocketContextType = {
    socket,
    session,
    messages,
    isConnected,
    createSession,
    joinSession,
    sendMessage,
    endSession,
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

// Custom hook to use the SocketContext
export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}; 