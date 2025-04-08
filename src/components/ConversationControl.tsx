import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { useSocket } from '@/contexts/SocketContext';
import { PersonaData } from '@/types/persona';

interface ConversationControlProps {
  onStatusChange?: (isActive: boolean) => void;
  selectedPersona: PersonaData | null;
}

const ConversationControl = ({ 
  selectedPersona 
}: ConversationControlProps) => {
  const { createSession, endSession, session, isConnected, socket } = useSocket();
  const isActive = !!session;

  // Add a state to prevent rapid double clicks/calls
  const [isToggling, setIsToggling] = useState(false);
  
  // State for audio recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null); // Store the stream to stop tracks later

  // Function to start recording
  const startRecording = async () => {
    try {
      if (streamRef.current) {
          console.warn("Stream already exists. Stopping tracks.");
          streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("Microphone access granted, stream obtained.");

      const recorder = new MediaRecorder(streamRef.current);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = []; // Clear previous chunks

      recorder.ondataavailable = (event) => {
        // Only require socket connection and non-empty data
        if (event.data.size > 0 && socket) { 
          // Get session ID directly if session object exists, otherwise skip emit
          const currentSessionId = session?.id;
          if (currentSessionId) {
            console.log("Audio chunk available, size:", event.data.size, "for session:", currentSessionId);
            socket.emit('VOICE_INPUT', { sessionId: currentSessionId, audioChunk: event.data });
          } else {
            console.log("Audio chunk available, but session ID not ready yet.");
          }
        } else {
            // Log why it might be skipped
            console.log(`Skipping audio chunk: size=${event.data.size}, socket=${!!socket}`);
        }
      };

      recorder.onstart = () => {
          console.log("MediaRecorder started");
      };

      recorder.onstop = () => {
        console.log("MediaRecorder stopped");
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop()); // Stop mic access
            streamRef.current = null;
            console.log("Microphone stream tracks stopped.");
        }
        // Optional: Send a final signal if needed
      };
      
      recorder.onerror = (event) => {
          console.error("MediaRecorder error:", event);
          toast.error("Recording Error", { description: "An error occurred during audio recording." });
          stopRecording(); // Attempt to stop on error
          setIsToggling(false); // Reset toggle lock
      }

      // Start recording, collecting data in chunks (e.g., every 500ms)
      recorder.start(500); 
      
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error("Microphone Error", { description: "Could not start audio recording. Please check permissions." });
      setIsToggling(false); // Reset toggle lock
      throw error; // Re-throw to prevent session start
    }
  };

  // Function to stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        console.log("Attempting to stop MediaRecorder...")
        mediaRecorderRef.current.stop();
    }
    if (streamRef.current) { // Ensure stream tracks are stopped even if recorder failed
        console.log("Stopping stream tracks explicitly...");
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
    mediaRecorderRef.current = null;
  };
  
  // Cleanup recording on component unmount or session end
  useEffect(() => {
      return () => {
          console.log("ConversationControl unmounting or session ended, ensuring recorder stops.");
          stopRecording();
      };
  }, []); // Run only on mount/unmount
  
  useEffect(() => {
      // If session ends externally (e.g., disconnect), stop recording
      if (!session && mediaRecorderRef.current?.state === 'recording') {
          console.log("Session ended, stopping recording.");
          stopRecording();
      }
  }, [session]);

  const handleToggleConversation = async () => {
    console.log("[handleToggleConversation] Called. isActive:", isActive, "isToggling:", isToggling);
    if (isToggling) {
        console.log("[handleToggleConversation] Already toggling, exiting.");
        return; 
    }
    setIsToggling(true);

    if (!isConnected) {
      toast.error("Not connected", { description: "Cannot start, not connected to server." });
      setIsToggling(false);
      return;
    }

    if (!isActive) {
      // --- Start Conversation ---
      console.log("[handleToggleConversation] Attempting to START session.");
      if (!selectedPersona) {
        toast.error("No Persona Selected", { description: "Please select a persona before starting." });
        setIsToggling(false);
        return;
      }
      
      try {
        // Start recording FIRST (which includes getting permissions)
        await startRecording();
        
        const studentId = "student123"; // Placeholder
        console.log("[handleToggleConversation] Emitting create_session with full persona data:", selectedPersona);
        createSession(studentId, selectedPersona); 
        toast.success("Starting conversation...");
        // Don't reset isToggling here; wait for session confirmation
      } catch (error) {
        console.error("Failed to start session or recording:", error);
        // No need for extra toast here, startRecording handles mic errors
        stopRecording(); // Ensure cleanup if session creation failed after mic started
        setIsToggling(false); 
      }
    } else {
      // --- End Conversation ---
      console.log("[handleToggleConversation] Attempting to END session.");
      stopRecording(); // Stop recording first
      console.log("[handleToggleConversation] Emitting end_session...");
      endSession();
      toast("Conversation ended");
      // Don't reset isToggling here; wait for session to become null
    }

    // Reset toggle lock based on state change or timeout?
    // Let's remove the timeout and rely on isActive change derived from session
    // setIsToggling(false); // We need to reset this based on successful start/end
    // A better approach might be useEffect watching isActive derived from session
    // For now, manually resetting after a delay might be okay for UI feedback
     setTimeout(() => setIsToggling(false), 500); 

  };

  // Reset isToggling when session state actually changes
  useEffect(() => {
      setIsToggling(false);
  }, [isActive]);

  return (
    <div className="mt-4">
      <Button
        className={`w-full py-6 text-base flex items-center gap-2 ${
          isActive 
            ? "bg-destructive hover:bg-destructive/90" 
            : "bg-utexas-orange hover:bg-utexas-orange/90"
        }`}
        onClick={handleToggleConversation}
        disabled={!isConnected || (!isActive && !selectedPersona)}
      >
        {isActive ? (
          <>
            <MicOff className="h-5 w-5" />
            End Conversation
          </>
        ) : (
          <>
            <Mic className="h-5 w-5" />
            Start Conversation
          </>
        )}
      </Button>
      
      {isActive && (
        <div className="flex items-center justify-center gap-2 mt-3 animate-pulse-slow">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-sm text-muted-foreground">
            {mediaRecorderRef.current?.state === 'recording' ? 'Listening...' : 'Mic Active'}
          </span>
        </div>
      )}
    </div>
  );
};

export default ConversationControl;
