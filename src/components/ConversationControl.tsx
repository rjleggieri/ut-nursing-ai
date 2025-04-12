import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toggle } from "@/components/ui/toggle";
import { toast } from '@/lib/toast';
import { useSocket } from '@/contexts/SocketContext';
import { PersonaData } from '@/types/persona';
import { getBrowserSupportedMimeType, MimeType, convertBlobToBase64 } from 'hume';

interface ConversationControlProps {
  onStatusChange?: (isActive: boolean) => void;
  selectedPersona: PersonaData | null;
}

const mimeTypeResult = getBrowserSupportedMimeType();
const mimeType = mimeTypeResult.success ? mimeTypeResult.mimeType : MimeType.WEBM;
console.log(`Using mimeType: ${mimeType} for MediaRecorder.`);

const ConversationControl = ({ 
  selectedPersona 
}: ConversationControlProps) => {
  const { createSession, endSession, session, isConnected, socket } = useSocket();
  const isActive = !!session;
  const [isToggling, setIsToggling] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null); 

  // *** Refs to hold latest state for error handler closure ***
  const isTogglingRef = useRef(isToggling);
  const isActiveRef = useRef(isActive);

  // *** Effect to keep refs updated ***
  useEffect(() => {
    isTogglingRef.current = isToggling;
    isActiveRef.current = isActive;
  }, [isToggling, isActive]);

  const startRecording = async () => {
    console.log("[startRecording] Entry.");
    if (!session?.id) {
        console.error("[startRecording] FAILED: No active session ID.");
        return false;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        console.warn("[startRecording] SKIPPED: Already recording.");
        return true; 
    }

    try {
      if (streamRef.current) {
          console.warn("[startRecording] Cleaning up stale stream...");
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
      }
      
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("[startRecording] getUserMedia SUCCESS."); 

      console.log("[startRecording] Creating MediaRecorder with explicit mimeType...");
      const recorder = new MediaRecorder(streamRef.current, { mimeType: mimeType });
      mediaRecorderRef.current = recorder;
      console.log("[startRecording] MediaRecorder CREATED.");

      recorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && socket && session?.id) { 
          try {
            const encodedAudioData = await convertBlobToBase64(event.data);
            socket.emit('VOICE_INPUT', { sessionId: session.id, encodedAudioData: encodedAudioData });
          } catch (error) {
              console.error("[ondataavailable] Error converting Blob to Base64:", error);
          }
        } 
      };

      recorder.onstart = () => {
          console.log(`>>> [onstart] MediaRecorder started.`);
      };

      recorder.onstop = () => {
        console.log(`>>> [onstop] MediaRecorder stopped.`);
        mediaRecorderRef.current = null; 
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
      };
      
      recorder.onerror = (event) => {
          console.error(">>> [onerror] MediaRecorder error:", event);
          toast.error("Recording Error", { description: "An error occurred during audio recording." });
          stopRecording(); 
          if (session?.id) { endSession(); }
      }

      console.log("[startRecording] Calling recorder.start(100)...");
      recorder.start(100); 
      console.log(`[startRecording] recorder.start(100) CALLED. State: ${mediaRecorderRef.current?.state}`);
      return true; 
      
    } catch (error) {
      console.error("[startRecording] CATCH block error:", error);
      toast.error("Microphone Error", { description: "Could not start audio recording. Please check permissions." });
      if (streamRef.current) { 
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
      }
      mediaRecorderRef.current = null;
      if (session?.id) { endSession(); }
      return false; 
    }
  };

  const stopRecording = useCallback(() => {
    console.log("[stopRecording] Entry. Current state:", mediaRecorderRef.current?.state);
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
        console.log(`[stopRecording] Attempting to stop MediaRecorder (state: ${recorder.state})...`)
        recorder.ondataavailable = null;
        recorder.onerror = null; 
        recorder.onstop = null;
        
        try {
            console.log("[stopRecording] Calling recorder.stop()...");
            recorder.stop();
            console.log("[stopRecording] recorder.stop() CALLED.");
        } catch (error) {
            console.error("[stopRecording] Error calling recorder.stop():", error);
        }
    }
    if (streamRef.current) {
        console.log("[stopRecording] Cleaning up stream tracks...");
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
    mediaRecorderRef.current = null; 
    setIsMuted(false);
    console.log("[stopRecording] Exit.");
  }, []);
  
  useEffect(() => {
      return () => {
          console.log("ConversationControl unmounting, ensuring cleanup.");
          stopRecording();
      };
  }, []);
  
  useEffect(() => {
      if (session && (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive')) {
          console.log("Session detected & recorder inactive/null, attempting to start recording...");
          startRecording(); 
      } 
      else if (!session && mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          console.log("Session ended or null & recorder active, ensuring recording stops.");
          stopRecording();
      }
  }, [session]);

  const handleToggleConversation = useCallback(async () => {
    console.log("[handleToggleConversation] Called. isActive:", isActiveRef.current, "isToggling:", isTogglingRef.current);
    if (isTogglingRef.current) return; 
    setIsToggling(true);

    try { 
        if (!isConnected) {
          toast.error("Not connected", { description: "Cannot start, not connected to server." });
          return;
        }
    
        if (!isActiveRef.current) {
          console.log("[handleToggleConversation] Attempting to START session.");
          if (!selectedPersona) {
            toast.error("No Persona Selected", { description: "Please select a persona before starting." });
            return;
          }
          try {
            const studentId = "student123"; 
            console.log("[handleToggleConversation] Emitting create_session...");
            createSession(studentId, selectedPersona); 
          } catch (error) {
            console.error("Error during createSession call:", error);
            toast.error("Session Error", { description: "Failed to initiate session on server." });
            setIsToggling(false);
          }
        } else {
          console.log("[handleToggleConversation] Attempting to END session.");
          stopRecording(); 
          console.log("[handleToggleConversation] Emitting end_session...");
          endSession(); 
          setIsMuted(false);
        }
    } catch(e) {
        console.error("[handleToggleConversation] Unexpected error:", e);
        setIsToggling(false);
    } 
  }, [isConnected, selectedPersona, createSession, endSession, stopRecording]);

  useEffect(() => {
      if (isTogglingRef.current && isActive === isActiveRef.current) {
         console.log(`[Effect isActive: ${isActive}] Resetting isToggling flag.`);
         setIsToggling(false);
      }
  }, [isActive]);

  // *** useEffect for generic error listener - SIMPLIFY DEPS ***
  useEffect(() => {
    const handleError = (error: { message: string }) => {
      // Use refs to check state at the time error occurs
      if (isTogglingRef.current && !isActiveRef.current) {
        console.error("[ConversationControl] Received error during session start attempt:", error);
        toast.error("Session Start Failed", { description: error.message || "Unknown server error" });
        // Still reset state if error happens during start toggle
        setIsToggling(false);
      }
    };

    if (socket) {
      socket.on('error', handleError);
      console.log("[ConversationControl] Attached generic error listener.");
    } else {
      console.log("[ConversationControl] Socket not ready, cannot attach error listener.");
    }

    return () => {
      if (socket) {
        socket.off('error', handleError);
        console.log("[ConversationControl] Detached generic error listener.");
      }
    };
    // *** Change dependencies to only [socket] ***
  }, [socket]); 

  // *** Mute/Unmute Logic ***
  const handleToggleMute = useCallback(() => {
    if (!streamRef.current) {
      console.warn("[handleToggleMute] No stream available.");
      return;
    }
    const audioTracks = streamRef.current.getAudioTracks();
    if (audioTracks.length === 0) {
        console.warn("[handleToggleMute] No audio tracks found in stream.");
        return;
    }
    const newState = !isMuted;
    audioTracks[0].enabled = !newState;
    setIsMuted(newState);
    console.log(`[handleToggleMute] Mic muted: ${newState}`);
  }, [isMuted]);

  return (
    <div className="mt-4 space-y-3">
      {/* Flex container for buttons */}
      <div className="flex gap-2">
        <Button
          className={`flex-1 py-6 text-base flex items-center justify-center gap-2 ${
            isActive
              ? "bg-destructive hover:bg-destructive/90"
              : "bg-utexas-orange hover:bg-utexas-orange/90"
          }`}
          onClick={handleToggleConversation}
          disabled={!isConnected || isToggling || (!isActive && !selectedPersona?.conversation_enabled)}
        >
          {isToggling ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isActive ? (
            <MicOff className="h-5 w-5" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
          {isToggling ? 'Processing...' : isActive ? 'End Conversation' : 'Start Conversation'}
        </Button>

        {/* Mute Toggle Button */}
        <Toggle
          pressed={isMuted}
          onPressedChange={handleToggleMute}
          disabled={!isActive || isToggling} 
          className="px-3 py-6" 
          aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
        >
          {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Toggle>
      </div>

      {isActive && (
        <div className="flex items-center justify-center gap-2 animate-pulse-slow">
          <div className={`w-3 h-3 rounded-full ${isMuted ? 'bg-gray-400' : 'bg-red-500'}`}></div> 
          <span className="text-sm text-muted-foreground">
            {mediaRecorderRef.current?.state === 'recording' ? (isMuted ? 'Mic Muted' : 'Listening...') : 'Initializing Mic...'}
          </span>
        </div>
      )}
    </div>
  );
};

export default ConversationControl;
