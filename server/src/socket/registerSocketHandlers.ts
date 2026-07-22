import type { Hume } from "hume";
import type { Server, Socket } from "socket.io";
import type { CloseEvent } from "ws";

import {
  closeEviSession,
  sendAudio,
  startEviSession,
  type EviCallbacks,
} from "../services/humeService";
import { sessionManager } from "../services/sessionManager";
import type { Message, PersonaData, SocketIdentity } from "../types/session";

interface CreateSessionPayload {
  studentId: string;
  personaData: PersonaData;
}

interface JoinSessionPayload {
  sessionId: string;
  facultyId: string;
}

interface VoiceInputPayload {
  sessionId: string;
  encodedAudioData: string;
}

type ChatPayload = Pick<Message, "sessionId" | "content" | "type">;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

function createEviCallbacks(io: Server, sessionId: string): EviCallbacks {
  return {
    onTranscription: ({ text, isFinal }) => {
      io.to(sessionId).emit("transcriptionUpdate", { text, isFinal });
      if (!isFinal || !text.trim()) return;

      const session = sessionManager.getSession(sessionId);
      if (!session) return;

      const message: Message = {
        sessionId,
        senderId: session.studentId,
        content: text.trim(),
        type: "transcription",
        timestamp: new Date().toISOString(),
      };
      sessionManager.addMessage(message);
      io.to(sessionId).emit("new_message", message);
    },
    onAssistantMessage: (event: Hume.empathicVoice.AssistantMessage) => {
      const content = event.message.content?.trim();
      if (!content) return;

      const message: Message = {
        sessionId,
        senderId: "HUME_AI",
        content,
        type: "ai",
        timestamp: new Date().toISOString(),
      };
      sessionManager.addMessage(message);
      io.to(sessionId).emit("assistantMessage", { text: content });
      io.to(sessionId).emit("new_message", message);
    },
    onAudioOutput: (audio: Buffer) => io.to(sessionId).emit("audioOutput", audio),
    onError: (error: Error) => {
      io.to(sessionId).emit("humeError", { message: error.message });
      closeEviSession(sessionId);
    },
    onClose: (event: CloseEvent) => {
      io.to(sessionId).emit("humeClose", {
        code: event.code,
        reason: event.reason?.toString() || "No reason given",
      });
    },
  };
}

async function connectEvi(io: Server, socket: Socket, sessionId: string, persona: PersonaData) {
  if (!persona.config_id) {
    socket.emit("humeError", {
      message: `Voice interaction is not configured for ${persona.name}.`,
    });
    return;
  }

  try {
    await startEviSession(sessionId, persona.config_id, createEviCallbacks(io, sessionId));
  } catch (error) {
    socket.emit("humeError", { message: errorMessage(error) });
  }
}

export function registerSocketHandlers(io: Server, socket: Socket): void {
  let identity: SocketIdentity | null = null;

  socket.on("create_session", async ({ studentId, personaData }: CreateSessionPayload) => {
    if (identity) {
      socket.emit("error", { message: "This connection already belongs to a session." });
      return;
    }

    try {
      const session = sessionManager.createSession(studentId, personaData);
      identity = { role: "student", sessionId: session.id, participantId: studentId };
      await socket.join(session.id);
      socket.emit("session_created", session);
      await connectEvi(io, socket, session.id, personaData);
    } catch (error) {
      socket.emit("error", { message: `Failed to create session: ${errorMessage(error)}` });
    }
  });

  socket.on("join_session", async ({ sessionId, facultyId }: JoinSessionPayload) => {
    if (identity) {
      socket.emit("error", { message: "This connection already belongs to a session." });
      return;
    }

    const session = sessionManager.getSession(sessionId);
    if (!session?.active || !sessionManager.addFaculty(sessionId, facultyId)) {
      socket.emit("error", { message: "Session not found or inactive." });
      return;
    }

    identity = { role: "faculty", sessionId, participantId: facultyId };
    await socket.join(sessionId);
    socket.emit("joined_session", session);
    socket.emit("message_history", sessionManager.getMessages(sessionId));
    await connectEvi(io, socket, sessionId, session.personaData);
  });

  socket.on("send_message", (payload: ChatPayload) => {
    if (!identity || payload.sessionId !== identity.sessionId) {
      socket.emit("error", { message: "Message does not belong to the active session." });
      return;
    }

    const content = payload.content?.trim();
    const expectedType = identity.role === "student" ? "student" : "faculty";
    const session = sessionManager.getSession(identity.sessionId);
    if (!content || payload.type !== expectedType || !session?.active) {
      socket.emit("error", { message: "Invalid message." });
      return;
    }

    const message: Message = {
      sessionId: identity.sessionId,
      senderId: identity.participantId,
      type: expectedType,
      content,
      timestamp: new Date().toISOString(),
    };
    sessionManager.addMessage(message);
    io.to(identity.sessionId).emit("new_message", message);
  });

  socket.on("VOICE_INPUT", ({ sessionId, encodedAudioData }: VoiceInputPayload) => {
    if (identity?.role !== "student" || identity.sessionId !== sessionId) return;
    sendAudio(sessionId, encodedAudioData);
  });

  socket.on("end_session", async ({ sessionId }: { sessionId: string }) => {
    if (identity?.role !== "student" || identity.sessionId !== sessionId) return;

    if (sessionManager.endSession(sessionId)) {
      closeEviSession(sessionId);
      io.to(sessionId).emit("session_ended", { sessionId });
    }
    await socket.leave(sessionId);
    identity = null;
  });

  socket.on("leave_session", async () => {
    if (identity?.role !== "faculty") return;

    sessionManager.removeFaculty(identity.sessionId, identity.participantId);
    await socket.leave(identity.sessionId);
    identity = null;
  });

  socket.on("disconnect", () => {
    if (!identity) return;

    if (identity.role === "student" && sessionManager.endSession(identity.sessionId)) {
      closeEviSession(identity.sessionId);
      io.to(identity.sessionId).emit("session_ended", { sessionId: identity.sessionId });
    } else if (identity.role === "faculty") {
      sessionManager.removeFaculty(identity.sessionId, identity.participantId);
    }
    identity = null;
  });
}
