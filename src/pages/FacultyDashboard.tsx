import { useEffect, useState } from "react";
import { Clipboard, Loader2, Save, Search, XCircle } from "lucide-react";

import ConversationWindow from "@/components/ConversationWindow";
import EvaluationTab from "@/components/EvaluationTab";
import FeedbackWindow from "@/components/FeedbackWindow";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSocket } from "@/hooks/useSocket";
import { evaluationCriteria } from "@/data/evaluationCriteria";
import { getParticipantId } from "@/lib/participantId";
import { toast } from "@/lib/toast";
import type { Message, Session } from "@/types/session";

type SessionStatus = "disconnected" | "connecting" | "connected" | "ended";

function messageKey(message: Message): string {
  return [message.timestamp, message.senderId, message.type, message.content].join("|");
}

function downloadJson(filename: string, data: unknown): void {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function FacultyDashboard() {
  const {
    isConnected: socketConnected,
    joinSession,
    leaveSession,
    messages,
    session,
    socket,
  } = useSocket();
  const [inputSessionId, setInputSessionId] = useState("");
  const [connectedSession, setConnectedSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<SessionStatus>("disconnected");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [sessionMessages, setSessionMessages] = useState<Message[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<string | null>(null);
  const [evaluationScores, setEvaluationScores] = useState<Record<number, string>>({});
  const [evaluationNotes, setEvaluationNotes] = useState("");

  useEffect(() => {
    if (!connectedSession) return;
    const relevant = messages.filter((message) => message.sessionId === connectedSession.id);

    setSessionMessages((current) => {
      const existing = new Set(current.map(messageKey));
      const additions = relevant.filter((message) => !existing.has(messageKey(message)));
      return additions.length ? [...current, ...additions] : current;
    });
  }, [connectedSession, messages]);

  useEffect(() => {
    if (status === "connecting" && session?.id === inputSessionId.trim()) {
      setConnectedSession(session);
      setSessionMessages(messages.filter((message) => message.sessionId === session.id));
      setStatus("connected");
      setConnectionError(null);
      toast.success("Connected to student session", { description: `Session ID: ${session.id}` });
    } else if (status === "connected" && connectedSession && !session) {
      setStatus("ended");
      toast.info("Student session ended", { description: "You can finish the evaluation and export it." });
    }
  }, [connectedSession, inputSessionId, messages, session, status]);

  useEffect(() => {
    if (status !== "connecting") return;
    const timer = window.setTimeout(() => {
      setStatus("disconnected");
      setConnectionError("Connection timed out. Check the session ID and try again.");
    }, 10_000);
    return () => window.clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    if (!socket) return;
    const handleError = ({ message }: { message: string }) => {
      if (status !== "connecting") return;
      setStatus("disconnected");
      setConnectionError(message);
    };
    socket.on("error", handleError);
    return () => {
      socket.off("error", handleError);
    };
  }, [socket, status]);

  const connect = () => {
    const sessionId = inputSessionId.trim();
    if (!socketConnected || !sessionId) return;

    setStatus("connecting");
    setConnectionError(null);
    setConnectedSession(null);
    setSessionMessages([]);
    setEvaluationScores({});
    setEvaluationNotes("");
    joinSession(sessionId, getParticipantId("faculty"));
  };

  const pasteSessionId = async () => {
    try {
      setInputSessionId((await navigator.clipboard.readText()).trim());
    } catch {
      toast.error("Clipboard access was denied.");
    }
  };

  const saveSession = () => {
    if (!connectedSession) return;

    const transcript = sessionMessages
      .filter(({ type }) => type === "ai" || type === "transcription")
      .map(({ timestamp, type, content }) => ({
        timestamp,
        speaker: type === "ai" ? `Patient (${connectedSession.personaData.name})` : "APRN Student",
        content,
      }));
    const facultyChat = sessionMessages
      .filter(({ type }) => type === "student" || type === "faculty")
      .map(({ timestamp, type, content }) => ({
        timestamp,
        speaker: type === "faculty" ? "Faculty" : "Student",
        content,
      }));
    const scores = Object.fromEntries(
      Object.entries(evaluationScores).map(([index, score]) => [
        evaluationCriteria[Number(index)]?.title ?? `Criterion ${index}`,
        score,
      ]),
    );

    downloadJson(`carespeak-session-${connectedSession.id}.json`, {
      sessionId: connectedSession.id,
      studentId: connectedSession.studentId,
      persona: connectedSession.personaData.name,
      startedAt: connectedSession.startTime,
      exportedAt: new Date().toISOString(),
      transcript,
      facultyChat,
      evaluation: { scores, notes: evaluationNotes },
    });
    toast.success("Session data downloaded.");
  };

  const disconnect = () => {
    leaveSession();
    setStatus("disconnected");
    setConnectedSession(null);
    setInputSessionId("");
    setSessionMessages([]);
    setSelectedQuote(null);
    setEvaluationScores({});
    setEvaluationNotes("");
    setConnectionError(null);
  };

  const conversationMessages = sessionMessages.filter(
    ({ type }) => type === "ai" || type === "transcription",
  );
  const feedbackMessages = sessionMessages.filter(
    ({ type }) => type === "student" || type === "faculty",
  );

  return (
    <div className="flex h-full flex-col bg-utexas-gray">
      <Header />
      <main className="container mx-auto flex flex-1 flex-col overflow-hidden py-4">
        <h1 className="mb-4 flex-shrink-0 text-xl font-bold text-utexas-navy">Faculty Dashboard</h1>

        {status === "disconnected" || status === "connecting" ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-lg font-medium">Connect to Student Session</h2>
              <div className="mb-4 flex items-center gap-2">
                <Input
                  value={inputSessionId}
                  onChange={(event) => setInputSessionId(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && connect()}
                  placeholder="Enter Session ID"
                  disabled={status === "connecting"}
                />
                <Button size="icon" variant="outline" onClick={pasteSessionId} disabled={status === "connecting"} title="Paste from clipboard">
                  <Clipboard className="h-4 w-4" />
                </Button>
              </div>
              {connectionError && <p className="mb-4 text-center text-sm text-red-600">{connectionError}</p>}
              <Button className="w-full" onClick={connect} disabled={status === "connecting" || !inputSessionId.trim() || !socketConnected}>
                {status === "connecting" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                {status === "connecting" ? "Connecting..." : "Connect to Session"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-12">
            <div className="flex flex-col overflow-hidden lg:col-span-8">
              <div className="flex h-full flex-1 flex-col overflow-hidden rounded-lg bg-white p-4 shadow">
                <div className="mb-3 flex flex-shrink-0 items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Student Session: {connectedSession?.id}</h2>
                    <div className={`mt-1 flex items-center text-sm ${status === "connected" ? "text-emerald-600" : "text-amber-600"}`}>
                      <div className={`mr-2 h-2 w-2 rounded-full ${status === "connected" ? "bg-emerald-600" : "bg-amber-600"}`} />
                      {status === "connected" ? "Connected" : "Session ended"}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={saveSession}><Save className="mr-2 h-4 w-4" />Save Session</Button>
                    <Button variant="destructive" size="sm" onClick={disconnect}><XCircle className="mr-2 h-4 w-4" />Disconnect</Button>
                  </div>
                </div>
                <Tabs defaultValue="conversation" className="flex min-h-0 w-full flex-1 flex-col">
                  <TabsList className="grid flex-shrink-0 grid-cols-2">
                    <TabsTrigger value="conversation">Live Conversation</TabsTrigger>
                    <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
                  </TabsList>
                  <TabsContent value="conversation" className="mt-2 flex-1 overflow-hidden">
                    <ConversationWindow messages={conversationMessages} isActive={status === "connected"} onQuoteSelect={setSelectedQuote} personaName={connectedSession?.personaData.name ?? null} />
                  </TabsContent>
                  <TabsContent value="evaluation" className="mt-2 flex-1 overflow-hidden rounded-md border bg-gray-50">
                    <EvaluationTab scores={evaluationScores} setScores={setEvaluationScores} notes={evaluationNotes} setNotes={setEvaluationNotes} />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
            <div className="flex flex-col overflow-hidden lg:col-span-4">
              <FeedbackWindow messages={feedbackMessages} isActive={status === "connected"} selectedQuote={selectedQuote} onMessageSent={() => setSelectedQuote(null)} currentUserType="faculty" title="Student/Faculty Chat" />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
