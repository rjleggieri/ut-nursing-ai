import crypto from "node:crypto";

import type { Message, PersonaData, Session } from "../types/session";

const SESSION_ID_LENGTH = 8;

function generateSessionId(): string {
  return crypto
    .randomBytes(Math.ceil(SESSION_ID_LENGTH / 2))
    .toString("hex")
    .slice(0, SESSION_ID_LENGTH);
}

export class SessionManager {
  private readonly sessions = new Map<string, Session>();
  private readonly messages = new Map<string, Message[]>();

  createSession(studentId: string, personaData: PersonaData): Session {
    if (!studentId.trim() || !personaData?.id) {
      throw new Error("A student ID and valid persona are required.");
    }

    let id = generateSessionId();
    while (this.sessions.has(id)) id = generateSessionId();

    const session: Session = {
      id,
      studentId,
      personaData,
      startTime: new Date().toISOString(),
      active: true,
      connectedFaculty: [],
    };

    this.sessions.set(id, session);
    this.messages.set(id, []);
    return session;
  }

  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  addFaculty(sessionId: string, facultyId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session?.active) return false;

    if (!session.connectedFaculty.includes(facultyId)) {
      session.connectedFaculty.push(facultyId);
    }
    return true;
  }

  removeFaculty(sessionId: string, facultyId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.connectedFaculty = session.connectedFaculty.filter((id) => id !== facultyId);
  }

  addMessage(message: Message): boolean {
    const sessionMessages = this.messages.get(message.sessionId);
    if (!sessionMessages) return false;

    sessionMessages.push(message);
    return true;
  }

  getMessages(sessionId: string): Message[] {
    return [...(this.messages.get(sessionId) ?? [])];
  }

  endSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session?.active) return false;

    session.active = false;
    return true;
  }
}

export const sessionManager = new SessionManager();
