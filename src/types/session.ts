// Client-side type definitions matching server/src/types/session.ts
// Ideally, these should be shared from a common package.

// Import PersonaData from the existing client-side definition
import { PersonaData } from './persona';

export interface Session {
  id: string;
  studentId: string;
  personaData: PersonaData | null; // Use the imported PersonaData type
  startTime: Date | string; // Allow string for serialization from server
  active: boolean;
  connectedFaculty: string[];
}

export interface Message {
  type: 'student' | 'ai' | 'faculty';
  content: string;
  timestamp: Date | string; // Allow string for serialization from server
  sessionId: string;
  senderId: string; 
} 