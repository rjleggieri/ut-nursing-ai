
import { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';

interface FeedbackMessage {
  id: string;
  content: string;
  sender: 'faculty' | 'system';
  timestamp: Date;
}

interface FeedbackWindowProps {
  sessionId: string;
  isActive: boolean;
}

const FeedbackWindow = ({ sessionId, isActive }: FeedbackWindowProps) => {
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Add a welcome message when component mounts
  useEffect(() => {
    setMessages([
      {
        id: '0',
        content: 'Faculty feedback will appear here once they connect to your session.',
        sender: 'system',
        timestamp: new Date(),
      },
    ]);
  }, []);
  
  // Simulate receiving faculty feedback
  useEffect(() => {
    if (isActive) {
      // Simulate a faculty feedback after conversation starts
      const timer = setTimeout(() => {
        addMessage({
          content: "I'm observing your conversation. Remember to use open-ended questions.",
          sender: 'faculty',
        });
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [isActive]);
  
  // Function to add a new message
  const addMessage = ({ content, sender }: { content: string, sender: 'faculty' | 'system' }) => {
    const newMessage: FeedbackMessage = {
      id: Date.now().toString(),
      content,
      sender,
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
  
  // Handle sending message
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim()) return;
    
    // In a real implementation, this would send a message to the faculty
    toast.info("Student message functionality not implemented", { 
      description: "In the full version, this would send a message to faculty" 
    });
    
    setInputValue('');
  };
  
  return (
    <div className="flex flex-col h-full border rounded-md">
      <div className="p-3 border-b bg-utexas-navy text-white font-medium">
        Faculty Feedback
      </div>
      
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4 chat-scrollbar">
        <div className="space-y-4">
          {messages.map(message => (
            <div 
              key={message.id} 
              className={`flex ${message.sender === 'system' ? 'justify-center' : 'justify-start'}`}
            >
              {message.sender === 'system' ? (
                <div className="bg-gray-100 text-gray-500 text-sm py-2 px-3 rounded">
                  {message.content}
                </div>
              ) : (
                <div className="bg-blue-100 py-2 px-3 rounded-lg max-w-[80%]">
                  <div className="text-xs font-medium mb-1">Faculty</div>
                  <p>{message.content}</p>
                  <div className="text-xs opacity-70 mt-1 text-right">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
      
      <form onSubmit={handleSubmit} className="p-3 border-t flex gap-2">
        <Input
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder="Type a message to faculty..."
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={!inputValue.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
};

export default FeedbackWindow;
