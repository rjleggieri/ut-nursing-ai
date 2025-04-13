import { useState, useEffect, useRef } from 'react';
import { Send, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSocket } from '@/contexts/SocketContext';
import { ClientMessage } from '@/contexts/SocketContext';
import { formatTimestamp } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface FeedbackWindowProps {
  sessionId: string;
  isActive: boolean;
  selectedQuote?: string | null;
  onMessageSent?: () => void;
  currentUserType: 'student' | 'faculty';
  title: string;
}

const FeedbackWindow = ({ sessionId, isActive, selectedQuote, onMessageSent, currentUserType, title }: FeedbackWindowProps) => {
  const { messages: allMessages, sendMessage, isConnected, session } = useSocket();
  const [inputValue, setInputValue] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const feedbackScrollAreaRef = useRef<HTMLDivElement>(null);
  const [feedbackMessages, setFeedbackMessages] = useState<ClientMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Filter messages based on the locally confirmed connected session
  // *** Only show STUDENT (text) and FACULTY messages ***
  const filteredMessages = allMessages.filter(msg => 
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
  }, [filteredMessages]);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [filteredMessages]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !isConnected || !session) return;
    
    let messageContent = inputValue.trim();
    if (selectedQuote) {
      messageContent = `> ${selectedQuote.split('\n').join('\n> ')}\n\n${messageContent}`;
    }

    sendMessage({
      type: currentUserType,
      senderId: currentUserType === 'student' ? session?.studentId ?? 'student???' : 'faculty456',
      content: messageContent,
    });
    
    setInputValue('');
    onMessageSent?.();
  };
  
  return (
    <div className="flex flex-col h-full border rounded-md bg-white">
       {/* Title Bar (flex-shrink-0) */}
       <div className="p-3 border-b bg-utexas-navy text-white font-medium flex-shrink-0">
         {title}
       </div>
      
       {/* Content: Replace ScrollArea with basic scrollable div */}
       <div className="flex-1 min-h-0 overflow-y-auto p-4">
         {filteredMessages.length === 0 ? (
           <div className="flex items-center justify-center h-full text-muted-foreground">
             {isActive ? "Waiting for messages..." : "Session inactive."}
           </div>
         ) : (
           <div className="space-y-4">
             {filteredMessages.map((msg, index) => {
               // Check for quote pattern
               const isQuoteReply = msg.content.startsWith('> ') && msg.content.includes('\n');
               let quotedText = '';
               let replyText = msg.content;

               if (isQuoteReply) {
                 const newlineIndex = msg.content.indexOf('\n');
                 quotedText = msg.content.substring(2, newlineIndex); // Remove '> '
                 replyText = msg.content.substring(newlineIndex + 1);
               }

               return (
                 <div 
                   key={`${msg.sessionId}-${msg.timestamp}-${msg.type}-${index}`}
                   className={cn(
                     "flex",
                     msg.type === currentUserType ? "justify-end" : "justify-start"
                   )}
                 >
                   {/* Conditionally render stacked bubbles or single bubble */}
                   {isQuoteReply ? (
                     <div className="flex flex-col"> {/* Container for stacked bubbles */}
                       {/* Quote Bubble */}
                       <div className="text-sm italic bg-gray-100 border-l-4 border-gray-300 p-2 rounded-md mb-1 max-w-xs lg:max-w-md">
                         {quotedText}
                       </div>
                       {/* Reply Bubble */}
                       <div 
                         className={cn(
                           "p-3 rounded-lg max-w-xs lg:max-w-md",
                           msg.type === currentUserType 
                             ? "bg-utexas-orange text-white"
                             : "bg-blue-100 text-gray-900"
                         )}
                       >
                         <p>{replyText}</p>
                         <p className="text-xs mt-1 opacity-75">
                           {formatTimestamp(msg.timestamp)}
                         </p>
                       </div>
                     </div>
                   ) : (
                     /* Standard Message Bubble */
                     <div 
                       className={cn(
                         "p-3 rounded-lg max-w-xs lg:max-w-md",
                         msg.type === currentUserType 
                           ? "bg-utexas-orange text-white"
                           : "bg-blue-100 text-gray-900"
                       )}
                     >
                       <p>{replyText}</p>
                       <p className="text-xs mt-1 opacity-75">
                         {formatTimestamp(msg.timestamp)}
                       </p>
                     </div>
                   )}
                 </div>
               );
             })}
             <div ref={messagesEndRef} />
           </div>
         )}
       </div>
      
       <div className="p-3 border-t">
         {selectedQuote && (
           <div className="mb-2 p-2 border-l-4 border-gray-300 bg-gray-50 text-sm text-gray-600 relative">
             <p className="italic truncate">Replying to: "{selectedQuote}"</p>
             {onMessageSent && (
                 <button 
                   onClick={onMessageSent}
                   className="absolute top-1 right-1 text-gray-400 hover:text-gray-600"
                   aria-label="Clear quote"
                 >
                     <X size={16} />
                 </button>
             )}
           </div>
         )}
         <form onSubmit={handleSubmit} className="flex gap-2">
           <Input
             value={inputValue}
             onChange={e => setInputValue(e.target.value)}
             placeholder={isActive ? "Type a message..." : "Session inactive"}
             className="flex-1"
             disabled={!isActive || !isConnected}
           />
           <Button type="submit" size="icon" disabled={!inputValue.trim() || !isActive || !isConnected}>
             <Send className="h-4 w-4" />
           </Button>
         </form>
       </div>
     </div>
  );
};

export default FeedbackWindow;
