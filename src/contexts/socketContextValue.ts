import { createContext } from "react";
import type { Socket } from "socket.io-client";

import type { PersonaData } from "@/types/persona";
import type { Message, Session } from "@/types/session";

export interface ChatMessageInput {
  type: "student" | "faculty";
  content: string;
}

export interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  session: Session | null;
  messages: Message[];
  transcription: string;
  isTranscriptionFinal: boolean;
  assistantResponse: string;
  createSession: (studentId: string, personaData: PersonaData) => void;
  joinSession: (sessionId: string, facultyId: string) => void;
  leaveSession: () => void;
  endSession: () => void;
  sendMessage: (message: ChatMessageInput) => void;
}

export const SocketContext = createContext<SocketContextValue | null>(null);

