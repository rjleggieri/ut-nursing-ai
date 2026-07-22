import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, MicOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { useSocket } from "@/hooks/useSocket";
import { getParticipantId } from "@/lib/participantId";
import { blobToBase64, getSupportedAudioMimeType } from "@/lib/audio";
import { toast } from "@/lib/toast";
import type { PersonaData } from "@/types/persona";

interface ConversationControlProps {
  selectedPersona: PersonaData | null;
}

const mimeType = getSupportedAudioMimeType();

export default function ConversationControl({ selectedPersona }: ConversationControlProps) {
  const { createSession, endSession, isConnected, session, socket } = useSocket();
  const [isToggling, setIsToggling] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    recorderRef.current = null;

    if (recorder && recorder.state !== "inactive") {
      recorder.ondataavailable = null;
      recorder.onerror = null;
      recorder.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setIsMuted(false);
  }, []);

  const startRecording = useCallback(async () => {
    if (!session || !socket || recorderRef.current?.state === "recording") return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType });
      streamRef.current = stream;
      recorderRef.current = recorder;

      recorder.ondataavailable = async ({ data }) => {
        if (!data.size || !socket.connected) return;
        const encodedAudioData = await blobToBase64(data);
        socket.emit("VOICE_INPUT", { sessionId: session.id, encodedAudioData });
      };
      recorder.onerror = () => {
        toast.error("Recording error", { description: "The microphone stream stopped unexpectedly." });
        stopRecording();
        endSession();
      };
      recorder.start(100);
    } catch (error) {
      stopRecording();
      endSession();
      toast.error("Microphone unavailable", {
        description: error instanceof Error ? error.message : "Check browser microphone permissions.",
      });
    }
  }, [endSession, session, socket, stopRecording]);

  useEffect(() => {
    if (session) void startRecording();
    else stopRecording();
    setIsToggling(false);
  }, [session, startRecording, stopRecording]);

  useEffect(() => stopRecording, [stopRecording]);

  useEffect(() => {
    if (!socket) return;
    const handleError = () => setIsToggling(false);
    socket.on("error", handleError);
    return () => {
      socket.off("error", handleError);
    };
  }, [socket]);

  const toggleConversation = () => {
    if (isToggling) return;
    if (!isConnected) {
      toast.error("Not connected", { description: "Wait for the server connection and try again." });
      return;
    }

    setIsToggling(true);
    if (session) {
      stopRecording();
      endSession();
      return;
    }

    if (!selectedPersona) {
      setIsToggling(false);
      toast.error("Select a patient profile first.");
      return;
    }
    createSession(getParticipantId("student"), selectedPersona);
  };

  const toggleMute = () => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (!track) return;

    const nextMuted = !isMuted;
    track.enabled = !nextMuted;
    setIsMuted(nextMuted);
  };

  const isActive = Boolean(session);
  return (
    <div className="mt-4 space-y-3">
      <div className="flex gap-2">
        <Button
          className={`flex-1 py-6 text-base ${isActive ? "bg-destructive hover:bg-destructive/90" : "bg-utexas-orange hover:bg-utexas-orange/90"}`}
          onClick={toggleConversation}
          disabled={!isConnected || isToggling || (!isActive && !selectedPersona?.conversation_enabled)}
        >
          {isToggling ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : isActive ? <MicOff className="mr-2 h-5 w-5" /> : <Mic className="mr-2 h-5 w-5" />}
          {isToggling ? "Processing..." : isActive ? "End Conversation" : "Start Conversation"}
        </Button>
        <Toggle
          pressed={isMuted}
          onPressedChange={toggleMute}
          disabled={!isActive || isToggling}
          className="px-3 py-6"
          aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
        >
          {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Toggle>
      </div>
      {isActive && (
        <div className="flex items-center justify-center gap-2">
          <div className={`h-3 w-3 rounded-full ${isMuted ? "bg-gray-400" : "animate-pulse bg-red-500"}`} />
          <span className="text-sm text-muted-foreground">{isMuted ? "Microphone muted" : "Listening..."}</span>
        </div>
      )}
    </div>
  );
}
