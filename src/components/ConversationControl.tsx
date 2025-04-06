
import { useState } from 'react';
import { Mic, MicOff, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';

interface ConversationControlProps {
  onStatusChange: (isActive: boolean) => void;
}

const ConversationControl = ({ onStatusChange }: ConversationControlProps) => {
  const [isActive, setIsActive] = useState(false);

  const handleToggleConversation = async () => {
    try {
      if (!isActive) {
        // In a real implementation, this would start the microphone and connect to a speech model
        // For now, we'll simulate enabling the microphone permission
        try {
          // Request microphone permissions
          await navigator.mediaDevices.getUserMedia({ audio: true });
          setIsActive(true);
          onStatusChange(true);
          toast.success("Conversation started");
        } catch (error) {
          console.error("Microphone permission denied:", error);
          toast.error("Microphone access needed", {
            description: "Please allow microphone access to use the conversation feature",
            action: {
              label: "Retry",
              onClick: () => handleToggleConversation(),
            },
          });
        }
      } else {
        // End the conversation
        setIsActive(false);
        onStatusChange(false);
        toast("Conversation ended");
      }
    } catch (error) {
      console.error("Error toggling conversation:", error);
    }
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
          <span className="text-sm text-muted-foreground">Recording</span>
        </div>
      )}
    </div>
  );
};

export default ConversationControl;
