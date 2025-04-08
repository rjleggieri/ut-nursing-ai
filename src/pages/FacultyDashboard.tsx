import { useState, useRef, useEffect } from 'react';
import { Search, Clipboard, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/lib/toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/Header';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSocket } from '@/contexts/SocketContext';
import ConversationWindow from '@/components/ConversationWindow';

// Helper to format timestamp (copied from FeedbackWindow/ConversationWindow)
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

const FacultyDashboard = () => {
  const [inputSessionId, setInputSessionId] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const { joinSession, session, messages: allMessages, sendMessage, isConnected: socketConnected } = useSocket();
  const connected = !!session;
  const actualSessionId = session?.id || '';
  const feedbackScrollAreaRef = useRef<HTMLDivElement>(null);

  // Filter messages for the feedback/chat window (student and faculty only)
  const feedbackMessages = allMessages.filter(msg => 
    msg.sessionId === actualSessionId && (msg.type === 'student' || msg.type === 'faculty')
  );
  
  // Scroll feedback area to bottom
  useEffect(() => {
    if (feedbackScrollAreaRef.current) {
        const scrollableViewport = feedbackScrollAreaRef.current.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]');
        if (scrollableViewport) {
            setTimeout(() => {
                scrollableViewport.scrollTop = scrollableViewport.scrollHeight;
            }, 50);
        }
    }
  }, [feedbackMessages]);

  const handleConnect = () => {
    if (!socketConnected) {
      toast.error("Not connected to server", { description: "Please wait or refresh." });
      return;
    }
    const trimmedSessionId = inputSessionId.trim();
    if (!trimmedSessionId) {
      toast.error("Please enter a valid Session ID");
      return;
    }
    
    const facultyId = "faculty456"; 
    
    console.log(`Attempting to join session: ${trimmedSessionId} as faculty: ${facultyId}`);
    joinSession(trimmedSessionId, facultyId);
  };

  const handleSendFeedback = () => {
    if (!feedbackText.trim() || !connected || !socketConnected || !session) return;
    
    // Send message using context
    sendMessage({
      type: 'faculty',
      content: feedbackText.trim(),
      sessionId: session.id
    });

    setFeedbackText('');
  };

  // Handle paste from clipboard
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInputSessionId(text);
      toast.info("Session ID pasted from clipboard");
    } catch (error) {
      toast.error("Could not access clipboard");
    }
  };

  return (
    <div className="min-h-screen bg-utexas-gray flex flex-col">
      <Header />
      
      <main className="container flex-1 pb-8">
        <h1 className="text-2xl font-bold mb-6 text-utexas-navy">Faculty Dashboard</h1>
        
        {!connected ? (
          <div className="max-w-md mx-auto bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium mb-4">Connect to Student Session</h2>
            
            <div className="flex items-center space-x-2 mb-6">
              <div className="flex-1">
                <Input
                  value={inputSessionId}
                  onChange={(e) => setInputSessionId(e.target.value)}
                  placeholder="Enter Session ID"
                />
              </div>
              <Button
                size="icon"
                variant="outline"
                onClick={handlePasteFromClipboard}
                title="Paste from clipboard"
              >
                <Clipboard className="h-4 w-4" />
              </Button>
            </div>
            
            <Button 
              className="w-full" 
              onClick={handleConnect} 
              disabled={!inputSessionId.trim() || !socketConnected}
            >
              <Search className="mr-2 h-4 w-4" />
              Connect to Session
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-white p-4 rounded-lg shadow">
                <h2 className="font-semibold text-lg mb-2">Student Session: {actualSessionId}</h2>
                <div className="flex items-center text-sm text-emerald-600 mb-4">
                  <div className="h-2 w-2 rounded-full bg-emerald-600 mr-2"></div>
                  Connected
                </div>
                
                <Tabs defaultValue="conversation" className="w-full">
                  <TabsList className="grid grid-cols-2">
                    <TabsTrigger value="conversation">Live Conversation</TabsTrigger>
                    <TabsTrigger value="metrics">Metrics & Analysis</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="conversation" className="mt-4">
                    <ConversationWindow 
                      messages={allMessages}
                      isActive={true}
                    />
                  </TabsContent>
                  
                  <TabsContent value="metrics" className="mt-4">
                    <div className="p-6 text-center border rounded-md h-[60vh] flex items-center justify-center">
                      <div className="text-muted-foreground">
                        Communication metrics and analysis will appear here as the conversation progresses.
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
            
            <div className="lg:col-span-4">
              <div className="bg-white p-4 rounded-lg shadow h-full flex flex-col">
                <h2 className="font-semibold text-lg mb-4">Student/Faculty Chat</h2>
                
                <ScrollArea ref={feedbackScrollAreaRef} className="flex-1 mb-4 max-h-[calc(100vh-400px)] border rounded-md bg-white p-4">
                  {feedbackMessages.length === 0 ? (
                     <div className="flex items-center justify-center h-full text-muted-foreground">
                        Chat messages will appear here.
                     </div>
                  ) : (
                    <div className="space-y-3">
                      {feedbackMessages.map((message, index) => (
                        <div 
                          key={`${message.sessionId}-${message.timestamp}-${index}`}
                          className={`flex ${message.type === 'faculty' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg py-2 px-3 shadow-sm break-words ${
                              message.type === 'faculty'
                                ? 'bg-blue-100 text-blue-900'
                                : 'bg-utexas-orange text-white'
                            }`}
                          >
                            <div className="text-xs font-medium mb-1 opacity-80">
                              {message.type === 'faculty' ? 'You (Faculty)' : 'Student'}
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
                
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleSendFeedback(); }}
                  className="mt-auto pt-4 border-t"
                >
                  <div className="flex gap-2">
                    <Input
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1"
                      disabled={!connected || !socketConnected}
                    />
                    <Button type="submit" disabled={!feedbackText.trim() || !connected || !socketConnected}>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default FacultyDashboard;
