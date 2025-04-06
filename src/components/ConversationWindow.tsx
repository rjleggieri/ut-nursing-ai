
import { useEffect, useRef, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message {
  id: string;
  role: 'student' | 'patient';
  content: string;
  timestamp: Date;
}

interface ConversationWindowProps {
  isActive: boolean;
}

const ConversationWindow = ({ isActive }: ConversationWindowProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Sample messages for demonstration
  useEffect(() => {
    if (isActive) {
      // Simulate an initial message from the patient after conversation starts
      const timer = setTimeout(() => {
        addMessage({
          role: 'patient', 
          content: "Hello, how are you today? I'm a little nervous about being here.",
        });
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [isActive]);
  
  // Function to add a new message
  const addMessage = ({ role, content }: { role: 'student' | 'patient', content: string }) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, newMessage]);
  };
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollableNode = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollableNode) {
        scrollableNode.scrollTop = scrollableNode.scrollHeight;
      }
    }
  }, [messages]);
  
  return (
    <div className="flex flex-col h-full border rounded-md">
      <div className="p-3 border-b bg-utexas-navy text-white font-medium">
        Patient Conversation
      </div>
      
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4 chat-scrollbar">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            {isActive 
              ? "Waiting for conversation to begin..." 
              : "Start a conversation to begin recording"}
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'student' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg py-2 px-3 ${
                    message.role === 'student'
                      ? 'bg-utexas-orange text-white'
                      : 'bg-gray-100'
                  }`}
                >
                  <div className="text-xs font-medium mb-1">
                    {message.role === 'student' ? 'You' : 'Patient'}
                  </div>
                  <p>{message.content}</p>
                  <div className="text-xs opacity-70 mt-1 text-right">
                    {message.timestamp.toLocaleTimeString()}
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
