import { useEffect, useRef, useState } from 'react';
import { Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSocket } from '@/hooks/useSocket';
import type { Message } from '@/types/session';
import { formatTimestamp } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface FeedbackWindowProps {
  isActive: boolean;
  selectedQuote?: string | null;
  onMessageSent?: () => void;
  currentUserType: 'student' | 'faculty';
  title: string;
  messages: Message[];
}

const FeedbackWindow = ({ isActive, selectedQuote, onMessageSent, currentUserType, title, messages }: FeedbackWindowProps) => {
  const { sendMessage, isConnected, session } = useSocket();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !isConnected || !session) return;
    
    let messageContent = inputValue.trim();
    if (selectedQuote) {
      messageContent = `> ${selectedQuote.split('\n').join('\n> ')}\n\n${messageContent}`;
    }

    sendMessage({
      type: currentUserType,
      content: messageContent,
    });
    
    setInputValue('');
    onMessageSent?.();
  };
  
  return (
    <div className="flex flex-col h-full border rounded-md bg-white">
       <div className="p-3 border-b bg-utexas-navy text-white font-medium flex-shrink-0">
         {title}
       </div>
      
       <div className="flex-1 min-h-0 overflow-y-auto p-4">
         {messages.length === 0 ? (
           <div className="flex items-center justify-center h-full text-muted-foreground">
             {isActive ? "Waiting for messages..." : "Session inactive."}
           </div>
         ) : (
           <div className="space-y-4">
             {messages.map((msg, index) => {
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
                   {isQuoteReply ? (
                     <div className="flex flex-col">
                       <div className="text-sm italic bg-gray-100 border-l-4 border-gray-300 p-2 rounded-md mb-1 max-w-xs lg:max-w-md">
                         {quotedText}
                       </div>
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
