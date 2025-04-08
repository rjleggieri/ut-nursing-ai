import { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSocket } from '@/contexts/SocketContext';
import { Message } from '@/contexts/SocketContext';

interface FeedbackWindowProps {
  sessionId: string;
  isActive: boolean;
}

const FeedbackWindow = ({ sessionId, isActive }: FeedbackWindowProps) => {
  const { messages: allMessages, sendMessage, isConnected, session } = useSocket();
  const [inputValue, setInputValue] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const chatMessages = allMessages.filter(msg => 
    msg.sessionId === session?.id && (msg.type === 'student' || msg.type === 'faculty')
  );
  
  useEffect(() => {
    if (scrollAreaRef.current) {
        const scrollableViewport = scrollAreaRef.current.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]');
        if (scrollableViewport) {
            setTimeout(() => {
                scrollableViewport.scrollTop = scrollableViewport.scrollHeight;
            }, 50);
        }
    }
  }, [chatMessages]);
  
  const formatTimestamp = (timestamp: Date | string | undefined): string => {
    if (!timestamp) return '--:--:--';
    try {
      const date = typeof timestamp === 'string' ? new Date(Date.parse(timestamp)) : timestamp;
      if (isNaN(date.getTime())) return '--:--:--';
      return date.toLocaleTimeString([], { 
          hour: 'numeric', 
          minute: '2-digit', 
          second: '2-digit'
      });
    } catch (e) {
      console.error("Error formatting timestamp:", timestamp, e);
      return '--:--:--';
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !isConnected || !session) return;
    
    sendMessage({
      type: 'student', 
      content: inputValue.trim(),
      sessionId: session.id
    });
    
    setInputValue('');
  };
  
  return (
    <div className="flex flex-col h-full border rounded-md">
      <div className="p-3 border-b bg-utexas-navy text-white font-medium">
        Faculty Chat
      </div>
      
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4 chat-scrollbar bg-white">
        {chatMessages.length === 0 ? (
           <div className="flex items-center justify-center h-full text-muted-foreground">
             {isActive 
               ? "Waiting for faculty message..." 
               : "Session inactive. Start a conversation to chat with faculty."}
           </div>
        ) : (
          <div className="space-y-4">
            {chatMessages.map((message, index) => (
              <div 
                key={`${message.sessionId}-${message.timestamp}-${index}`}
                className={`flex ${message.type === 'student' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg py-2 px-3 shadow-sm break-words ${
                    message.type === 'student'
                      ? 'bg-utexas-orange text-white'
                      : 'bg-blue-100 text-blue-900'
                  }`}
                >
                  <div className="text-xs font-medium mb-1 opacity-80">
                    {message.type === 'student' ? 'You (Student)' : 'Faculty'}
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
      
      <form onSubmit={handleSubmit} className="p-3 border-t flex gap-2">
        <Input
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder={isActive ? "Type a message to faculty..." : "Session inactive"}
          className="flex-1"
          disabled={!isActive || !isConnected}
        />
        <Button type="submit" size="icon" disabled={!inputValue.trim() || !isActive || !isConnected}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
};

export default FeedbackWindow;
