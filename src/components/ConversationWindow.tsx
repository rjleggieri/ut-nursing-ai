import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Message } from '@/types/session';
import { formatTimestamp } from '@/lib/utils';

interface ConversationWindowProps {
  isActive: boolean;
  messages: Message[];
  onQuoteSelect?: (quote: string) => void;
  personaName: string | null;
}

const ConversationWindow = ({ isActive, messages, onQuoteSelect, personaName }: ConversationWindowProps) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const conversationMessages = messages.filter(msg => msg.type === 'ai' || msg.type === 'transcription');
  
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollableViewport = scrollAreaRef.current.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]');
      if (scrollableViewport) {
          setTimeout(() => {
              scrollableViewport.scrollTop = scrollableViewport.scrollHeight;
          }, 50); 
      }
    }
  }, [conversationMessages]);
  
  const getSenderName = (type: Message['type'], currentPersonaName: string | null): string => {
      if (type === 'ai') return `Patient (${currentPersonaName || 'AI'})`;
      if (type === 'transcription') return 'APRN Student';
      return 'Other';
  };
  
  return (
    <div className="flex flex-col h-full border rounded-md">
      <div className="p-3 border-b bg-utexas-navy text-white font-medium">
        Patient Conversation Log
      </div>
      
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4 chat-scrollbar bg-white">
        {conversationMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            {isActive 
              ? "Waiting for conversation to begin..." 
              : "Session inactive or not started"}
          </div>
        ) : (
          <div className="space-y-4">
            {conversationMessages.map((message, index) => (
              <div
                key={`${message.sessionId}-${message.timestamp}-${index}`}
                className={`flex ${message.type === 'transcription' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg py-2 px-3 shadow-sm break-words cursor-pointer hover:shadow-md transition-shadow ${
                    message.type === 'transcription'
                      ? 'bg-blue-100 text-gray-900'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                  onClick={() => onQuoteSelect?.(message.content)}
                  title="Click to quote this message"
                >
                  <div className="text-xs font-medium mb-1 opacity-80">
                    {getSenderName(message.type, personaName)} 
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
