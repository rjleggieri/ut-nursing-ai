import { Session, Message, PersonaData } from '../types/session';
// import { v4 as uuidv4 } from 'uuid'; // Remove uuid
import crypto from 'crypto'; // Import crypto

// Function to generate a shorter ID
function generateShortId(length: number = 8): string {
  // Generate random bytes, convert to hex, take substring
  // Each byte becomes 2 hex chars, so need length/2 bytes
  const bytesNeeded = Math.ceil(length / 2);
  return crypto.randomBytes(bytesNeeded).toString('hex').slice(0, length);
}

class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private messages: Map<string, Message[]> = new Map();

  createSession(studentId: string, personaData: PersonaData): Session {
    if (!personaData || !personaData.id) {
        // Basic validation - might want more robust checks
        throw new Error("Invalid persona data provided for session creation.");
    }
    const session: Session = {
      id: generateShortId(), 
      studentId,
      personaData: personaData, // Store the full object
      startTime: new Date(),
      active: true,
      connectedFaculty: []
    };

    this.sessions.set(session.id, session);
    this.messages.set(session.id, []);
    console.log(`SessionManager: Created session ${session.id} with persona ${personaData.id}`);
    return session;
  }

  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  addFacultyToSession(sessionId: string, facultyId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session && session.active) {
      if (!session.connectedFaculty.includes(facultyId)) {
        session.connectedFaculty.push(facultyId);
        console.log(`SessionManager: Added faculty ${facultyId} to session ${sessionId}`);
        return true;
      }
    }
    console.warn(`SessionManager: Failed to add faculty ${facultyId} to session ${sessionId}`);
    return false;
  }

  addMessage(message: Message): void {
    const messages = this.messages.get(message.sessionId) || [];
    messages.push(message);
    this.messages.set(message.sessionId, messages);
    console.log(`SessionManager: Added message to session ${message.sessionId}`);
  }

  getMessages(sessionId: string): Message[] {
    return this.messages.get(sessionId) || [];
  }

  endSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.active = false;
      console.log(`SessionManager: Ended session ${sessionId}`);
      return true;
    }
    console.warn(`SessionManager: Failed to end session ${sessionId} (not found)`);
    return false;
  }

  // Optional: Method to remove faculty on disconnect
  removeFacultyFromSession(sessionId: string, facultyId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
        const index = session.connectedFaculty.indexOf(facultyId);
        if (index > -1) {
            session.connectedFaculty.splice(index, 1);
            console.log(`SessionManager: Removed faculty ${facultyId} from session ${sessionId}`);
        }
    }
  }
}

export const sessionManager = new SessionManager(); 