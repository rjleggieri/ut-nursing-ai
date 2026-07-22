import type { PersonaData } from "./persona";

export type MessageType = "student" | "ai" | "faculty" | "transcription";

export interface Session {
  id: string;
  studentId: string;
  personaData: PersonaData;
  startTime: string;
  active: boolean;
  connectedFaculty: string[];
}

export interface Message {
  type: MessageType;
  content: string;
  timestamp: string;
  sessionId: string;
  senderId: string; 
}
