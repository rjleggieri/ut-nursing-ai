import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { io, type Socket } from "socket.io-client";

import {
  SocketContext,
  type ChatMessageInput,
  type SocketContextValue,
} from "@/contexts/socketContextValue";
import { useAudioPlayback } from "@/hooks/useAudioPlayback";
import { toast } from "@/lib/toast";
import type { PersonaData } from "@/types/persona";
import type { Message, Session } from "@/types/session";

function getServerUrl(): string {
  return import.meta.env.VITE_WS_SERVER_URL || "http://localhost:3001";
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [transcription, setTranscription] = useState("");
  const [isTranscriptionFinal, setIsTranscriptionFinal] = useState(false);
  const [assistantResponse, setAssistantResponse] = useState("");
  const sessionRef = useRef<Session | null>(null);
  const { enqueue, stop: stopPlayback } = useAudioPlayback();

  const clearLiveState = useCallback(() => {
    setSession(null);
    setMessages([]);
    setTranscription("");
    setIsTranscriptionFinal(false);
    setAssistantResponse("");
    stopPlayback();
  }, [stopPlayback]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    const connection = io(getServerUrl());
    setSocket(connection);

    connection.on("connect", () => setIsConnected(true));
    connection.on("disconnect", (reason) => {
      setIsConnected(false);
      clearLiveState();
      toast.error("Disconnected", { description: `Server connection lost: ${reason}` });
    });
    connection.on("connect_error", (error) => {
      setIsConnected(false);
      toast.error("Connection error", { description: error.message });
    });
    connection.on("session_created", (createdSession: Session) => {
      clearLiveState();
      setSession(createdSession);
    });
    connection.on("joined_session", (joinedSession: Session) => setSession(joinedSession));
    connection.on("session_ended", ({ sessionId }: { sessionId: string }) => {
      if (sessionRef.current?.id === sessionId) clearLiveState();
    });
    connection.on("message_history", (history: Message[]) => setMessages(history));
    connection.on("new_message", (message: Message) => {
      setMessages((current) => [...current, message]);
    });
    connection.on("transcriptionUpdate", ({ text, isFinal }) => {
      setTranscription(text);
      setIsTranscriptionFinal(isFinal);
      stopPlayback();
    });
    connection.on("assistantMessage", ({ text }: { text: string }) => {
      setAssistantResponse(text);
    });
    connection.on("audioOutput", enqueue);
    connection.on("user_interruption", stopPlayback);
    connection.on("humeError", ({ message }: { message: string }) => {
      stopPlayback();
      toast.error("Voice service error", { description: message });
    });
    connection.on("humeClose", stopPlayback);
    connection.on("error", ({ message }: { message: string }) => {
      toast.error("Server error", { description: message || "Unknown server error" });
    });

    return () => {
      connection.disconnect();
      setSocket(null);
      setIsConnected(false);
      clearLiveState();
    };
  }, [clearLiveState, enqueue, stopPlayback]);

  const createSession = useCallback(
    (studentId: string, personaData: PersonaData) => {
      if (!socket?.connected) {
        toast.error("Cannot create session", { description: "The server is not connected." });
        return;
      }
      socket.emit("create_session", { studentId, personaData });
    },
    [socket],
  );

  const joinSession = useCallback(
    (sessionId: string, facultyId: string) => {
      if (!socket?.connected) {
        toast.error("Cannot join session", { description: "The server is not connected." });
        return;
      }
      socket.emit("join_session", { sessionId, facultyId });
    },
    [socket],
  );

  const endSession = useCallback(() => {
    if (socket?.connected && session) socket.emit("end_session", { sessionId: session.id });
  }, [session, socket]);

  const leaveSession = useCallback(() => {
    if (socket?.connected) socket.emit("leave_session");
    clearLiveState();
  }, [clearLiveState, socket]);

  const sendMessage = useCallback(
    (message: ChatMessageInput) => {
      if (!socket?.connected || !session) {
        toast.error("Cannot send message", { description: "There is no active session." });
        return;
      }
      socket.emit("send_message", { ...message, sessionId: session.id });
    },
    [session, socket],
  );

  const value = useMemo<SocketContextValue>(
    () => ({
      socket,
      isConnected,
      session,
      messages,
      transcription,
      isTranscriptionFinal,
      assistantResponse,
      createSession,
      joinSession,
      leaveSession,
      endSession,
      sendMessage,
    }),
    [
      socket,
      isConnected,
      session,
      messages,
      transcription,
      isTranscriptionFinal,
      assistantResponse,
      createSession,
      joinSession,
      leaveSession,
      endSession,
      sendMessage,
    ],
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

