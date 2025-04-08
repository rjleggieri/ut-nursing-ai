import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

// Use the Message type consistent with SocketContext
import { Message } from '@/contexts/SocketContext'; 

interface ConversationWindowProps {
  isActive: boolean;
  messages: Message[]; // Receives all messages from context
}

const ConversationWindow = ({ isActive, messages }: ConversationWindowProps) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Filter messages to only show AI/Patient
  const patientMessages = messages.filter(msg => msg.type === 'ai');
  
  // Scroll to bottom when patientMessages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollableViewport = scrollAreaRef.current.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]');
      if (scrollableViewport) {
          // Slight delay to allow DOM update before scrolling
          setTimeout(() => {
              scrollableViewport.scrollTop = scrollableViewport.scrollHeight;
          }, 50); 
      }
    }
  }, [patientMessages]); // Depend on filtered messages
  
  // Helper to format timestamp
  const formatTimestamp = (timestamp: Date | string | undefined): string => {
    if (!timestamp) return '--:--:--';
    try {
      // Ensure it's a Date object. If it's a string, parse it.
      const date = typeof timestamp === 'string' ? new Date(Date.parse(timestamp)) : timestamp;
      // Check if the date is valid after parsing
      if (isNaN(date.getTime())) return '--:--:--'; 
      return date.toLocaleTimeString([], { 
          hour: 'numeric', 
          minute: '2-digit', 
          second: '2-digit' // Add seconds
      });
    } catch (e) {
      console.error("Error formatting timestamp:", timestamp, e);
      return '--:--:--';
    }
  };
  
  // Helper to determine sender display name
  const getSenderName = (type: 'student' | 'ai' | 'faculty'): string => {
      // Simplified for this window's purpose
      if (type === 'ai') return 'Patient (AI)';
      return 'Other'; // Should ideally not happen if filtered correctly
  };
  
  return (
    <div className="flex flex-col h-full border rounded-md">
      <div className="p-3 border-b bg-utexas-navy text-white font-medium">
        Patient Conversation Log
      </div>
      
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4 chat-scrollbar bg-white">
        {patientMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            {isActive 
              ? "Waiting for conversation to begin..." 
              : "Session inactive or not started"}
          </div>
        ) : (
          <div className="space-y-4">
            {patientMessages.map((message, index) => (
              <div
                key={`${message.sessionId}-${message.timestamp}-${index}`}
                className={`flex justify-start`}
              >
                <div
                  className={`max-w-[80%] rounded-lg py-2 px-3 shadow-sm break-words bg-gray-100 text-gray-900`}
                >
                  <div className="text-xs font-medium mb-1 opacity-80">
                    {getSenderName(message.type)} 
                  </div>
                  <p>{message.content}</p>
                  <div className="text-xs opacity-70 mt-1 text-right">
                    {formatTimestamp(message.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default ConversationWindow;
