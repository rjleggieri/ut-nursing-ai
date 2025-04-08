import { useState, useRef, useEffect } from 'react';
import { Search, Clipboard, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/lib/toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/Header';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSocket } from '@/contexts/SocketContext';
import ConversationWindow from '@/components/ConversationWindow';
import { Session } from '@/contexts/SocketContext';
import { formatTimestamp } from '@/lib/utils';

const FacultyDashboard = () => {
  const [inputSessionId, setInputSessionId] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const { 
    joinSession, 
    session: contextSession,
    messages: allMessages, 
    sendMessage, 
    isConnected: socketConnected 
  } = useSocket();
  
  // Local state for faculty connection status
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedSession, setConnectedSession] = useState<Session | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const feedbackScrollAreaRef = useRef<HTMLDivElement>(null);

  // Filter messages based on the locally confirmed connected session
  const feedbackMessages = allMessages.filter(msg => 
    msg.sessionId === connectedSession?.id && (msg.type === 'student' || msg.type === 'faculty')
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

  // Effect to handle connection success/failure after initiating join
  useEffect(() => {
    if (isConnecting) {
      if (contextSession?.id === inputSessionId.trim()) {
        // Successfully connected to the target session!
        setConnectedSession(contextSession);
        setIsConnecting(false);
        setConnectionError(null);
        toast.success("Connected to student session", {
          description: `Session ID: ${contextSession.id}`
        });
      } 
      // Note: We need a way to detect failure. The context currently 
      // doesn't explicitly signal a join *failure* for a specific faculty attempt.
      // For now, we'll rely on a timeout or the user manually trying again.
      // A simple timeout example (could be improved):
      const timer = setTimeout(() => {
        if (isConnecting && !connectedSession) {
          setIsConnecting(false);
          setConnectionError('Connection attempt timed out.');
          toast.error('Connection Failed', { description: 'Could not connect to the session. Please check the ID and try again.' });
        }
      }, 10000); // 10 second timeout

      return () => clearTimeout(timer);
    }
  }, [contextSession, isConnecting, inputSessionId]); // Re-run if contextSession changes while connecting

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
    setIsConnecting(true); // Set connecting status
    setConnectionError(null); // Clear previous errors
    joinSession(trimmedSessionId, facultyId); // Call context function
  };

  const handleSendFeedback = () => {
    if (!feedbackText.trim() || !connectedSession || !socketConnected) return;
    
    sendMessage({
      type: 'faculty',
      content: feedbackText.trim(),
      sessionId: connectedSession.id
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
      
      <main className="container flex-1 pb-8 flex flex-col">
        <h1 className="text-2xl font-bold mb-6 text-utexas-navy">Faculty Dashboard</h1>
        
        {!connectedSession ? (
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
            
            {connectionError && (
                <p className="text-sm text-red-600 mb-4 text-center">{connectionError}</p>
            )}
            
            <Button 
              className="w-full" 
              onClick={handleConnect} 
              disabled={isConnecting || !inputSessionId.trim() || !socketConnected}
            >
              {isConnecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              {isConnecting ? 'Connecting...' : 'Connect to Session'}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
            <div className="lg:col-span-8 space-y-6 flex flex-col">
              <div className="bg-white p-4 rounded-lg shadow flex-1 flex flex-col">
                <h2 className="font-semibold text-lg mb-2">Student Session: {connectedSession.id}</h2>
                <div className="flex items-center text-sm text-emerald-600 mb-4">
                  <div className="h-2 w-2 rounded-full bg-emerald-600 mr-2"></div>
                  Connected
                </div>
                
                <Tabs defaultValue="conversation" className="w-full flex flex-col flex-1">
                  <TabsList className="grid grid-cols-2">
                    <TabsTrigger value="conversation">Live Conversation</TabsTrigger>
                    <TabsTrigger value="metrics">Metrics & Analysis</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="conversation" className="mt-4 flex-1">
                    <ConversationWindow 
                      messages={allMessages}
                      isActive={true}
                    />
                  </TabsContent>
                  
                  <TabsContent value="metrics" className="mt-4 flex-1">
                    <div className="p-6 text-center border rounded-md h-full flex items-center justify-center">
                      <div className="text-muted-foreground">
                        Communication metrics and analysis will appear here as the conversation progresses.
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
            
            <div className="lg:col-span-4 flex flex-col">
              <div className="bg-white p-4 rounded-lg shadow h-full flex flex-col">
                <h2 className="font-semibold text-lg mb-4">Student/Faculty Chat</h2>
                
                <ScrollArea ref={feedbackScrollAreaRef} className="flex-1 mb-4 border rounded-md bg-white p-4">
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
                                ? 'bg-utexas-orange text-white'
                                : 'bg-blue-100 text-blue-900'
                            }`}
                          >
                            <p className="mb-1">{message.content}</p>
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
                      disabled={!connectedSession || !socketConnected}
                    />
                    <Button type="submit" disabled={!feedbackText.trim() || !connectedSession || !socketConnected}>
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
