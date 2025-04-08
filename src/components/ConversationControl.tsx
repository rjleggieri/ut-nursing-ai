import { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { useSocket } from '@/contexts/SocketContext';
import { Persona } from '@/types/persona';

interface ConversationControlProps {
  onStatusChange?: (isActive: boolean) => void;
  selectedPersona: Partial<Persona> | null;
}

const ConversationControl = ({ 
  selectedPersona 
}: ConversationControlProps) => {
  const { createSession, endSession, session, isConnected } = useSocket();
  const isActive = !!session;

  // Add a state to prevent rapid double clicks/calls
  const [isToggling, setIsToggling] = useState(false);

  const handleToggleConversation = async () => {
    console.log("[handleToggleConversation] Called. isActive:", isActive, "isToggling:", isToggling);
    if (isToggling) {
        console.log("[handleToggleConversation] Already toggling, exiting.");
        return; // Prevent double execution
    }
    setIsToggling(true);

    if (!isConnected) {
      toast.error("Not connected", { description: "Cannot start, not connected to server." });
      setIsToggling(false); // Reset toggle lock
      return;
    }

    if (!isActive) {
      // --- Start Conversation ---
      console.log("[handleToggleConversation] Attempting to START session.");
      if (!selectedPersona || !selectedPersona.name) {
        toast.error("No Persona Selected", { description: "Please select a persona before starting." });
        setIsToggling(false); // Reset toggle lock
        return;
      }
      
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const studentId = "student123";
        console.log("[handleToggleConversation] Emitting create_session...");
        createSession(studentId, selectedPersona.name);
        toast.success("Starting conversation...");
        // No need to setIsToggling(false) here, wait for session state change
      } catch (error) {
        console.error("Microphone permission denied or session creation failed:", error);
        toast.error("Microphone access needed", {
          description: "Please allow microphone access and ensure connection to start.",
        });
        setIsToggling(false); // Reset toggle lock on error
      }
    } else {
      // --- End Conversation ---
      console.log("[handleToggleConversation] Attempting to END session.");
      console.log("[handleToggleConversation] Emitting end_session...");
      endSession();
      toast("Conversation ended");
      // No need to setIsToggling(false) here, wait for session state change
    }

    // Reset toggle lock after a short delay OR rely on session state change
    // For simplicity, let's reset after a delay here, but ideally state changes handle this
    setTimeout(() => setIsToggling(false), 500); // Add a small delay to prevent immediate re-click issues

  };

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
          <span className="text-sm text-muted-foreground">Recording...</span>
        </div>
      )}
    </div>
  );
};

export default ConversationControl;
