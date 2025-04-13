import { useState, useRef, useEffect } from 'react';
import { Search, Clipboard, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/lib/toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/Header';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useSocket } from '@/contexts/SocketContext';
import ConversationWindow from '@/components/ConversationWindow';
import { Session } from '@/contexts/SocketContext';
import { formatTimestamp } from '@/lib/utils';
import FeedbackWindow from '@/components/FeedbackWindow';

// Define evaluation criteria and component here
const evaluationCriteria = [
  {
    title: "Communication Skills",
    description: "Evaluate clarity, appropriateness of terminology, and adaptability based on patient understanding.",
  },
  {
    title: "Empathy and Compassion",
    description: "Assess genuine empathy, responsiveness to emotional cues, and ability to convey compassion.",
  },
  {
    title: "Active Listening",
    description: "Consider time allowed for patient speech, understanding through acknowledgment, and addressing concerns.",
  },
  {
    title: "Patient Education and Guidance",
    description: "Evaluate clarity in explaining medical concepts and adjusting based on patient understanding.",
  },
  {
    title: "Cultural Competence",
    description: "Assess sensitivity to cultural values and incorporation of patient beliefs into care discussions.",
  },
  {
    title: "Professionalism",
    description: "Evaluate tone, response to challenges, and maintenance of appropriate boundaries.",
  },
  {
    title: "Organization and Structure",
    description: "Consider logical flow of conversation and clarity in outlining important points.",
  },
  {
    title: "Patient-Centered Approach",
    description: "Assess partnership with the patient and focus on their needs and preferences.",
  },
  {
    title: "Responsiveness to Patient Feedback",
    description: "Evaluate adaptability based on patient responses and acknowledgment of emotions.",
  },
  {
    title: "Confidence and Comfort Level",
    description: "Assess confidence during interactions and ability to manage discomfort while providing care.",
  },
];

const EvaluationTab = () => {
  // TODO: Implement state management for radio button selections and notes
  return (
    <ScrollArea className="h-full p-4"> 
      {/* Wrap criteria and notes in a single div for spacing */}
      <div className="space-y-6"> 
        {evaluationCriteria.map((criterion, index) => (
          <div key={index} className="bg-white rounded-lg p-4 shadow-sm border"> 
            <h3 className="font-semibold text-lg mb-1 text-utexas-navy">{criterion.title}</h3>
            <p className="text-sm text-gray-600 mb-3">{criterion.description}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2"> 
              {["Poor", "Fair", "Satisfactory", "Very good", "Excellent"].map((option) => (
                <label key={option} className="flex items-center text-sm cursor-pointer">
                  <input 
                    type="radio" 
                    name={`criterion-${index}`} 
                    value={option} 
                    className="mr-1.5 h-4 w-4 text-utexas-orange focus:ring-utexas-orange border-gray-300" 
                  />
                  {option}
                </label>
              ))}
            </div>
          </div>
        ))}
        
        {/* Add Additional Notes Section */}
        <div className="bg-white rounded-lg p-4 shadow-sm border">
           <h3 className="font-semibold text-lg mb-2 text-utexas-navy">Additional Notes</h3>
           <Textarea 
             placeholder="Enter any additional feedback or observations here..."
             rows={5}
             className="text-sm"
             // TODO: Add value and onChange handler for state management
           />
         </div>
      </div>
    </ScrollArea>
  );
};

const FacultyDashboard = () => {
  const [inputSessionId, setInputSessionId] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [selectedQuote, setSelectedQuote] = useState<string | null>(null);
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
      senderId: 'faculty456',
      content: feedbackText.trim(),
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

  // *** Handler for selecting a quote ***
  const handleQuoteSelect = (quote: string) => {
    setSelectedQuote(quote);
    // Optionally focus the feedback input here
  };

  // *** Handler to clear the quote (e.g., after sending) ***
  const clearSelectedQuote = () => {
    setSelectedQuote(null);
  };

  return (
    <div className="h-full bg-utexas-gray flex flex-col">
      <Header />
      
      <main className="container mx-auto flex-1 py-4 flex flex-col overflow-hidden">
        <h1 className="text-xl font-bold mb-4 text-utexas-navy flex-shrink-0">Faculty Dashboard</h1>
        
        {!connectedSession ? (
          <div className="flex-1 flex items-center justify-center">
             <div className="w-full max-w-md bg-white rounded-lg shadow p-6">
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
           </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 overflow-hidden">
            <div className="lg:col-span-8 flex flex-col overflow-hidden">
              <div className="bg-white p-4 rounded-lg shadow flex-1 flex flex-col overflow-hidden h-full">
                <div className="flex-shrink-0 mb-3">
                  <h2 className="font-semibold text-lg">Student Session: {connectedSession.id}</h2>
                  <div className="flex items-center text-sm text-emerald-600 mt-1">
                    <div className="h-2 w-2 rounded-full bg-emerald-600 mr-2"></div>
                    Connected
                  </div>
                </div>
                
                <Tabs defaultValue="conversation" className="w-full flex flex-col flex-1 min-h-0">
                  <TabsList className="grid grid-cols-2 flex-shrink-0">
                    <TabsTrigger value="conversation">Live Conversation</TabsTrigger>
                    <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="conversation" className="mt-2 flex-1 overflow-hidden">
                    <ConversationWindow 
                      messages={allMessages}
                      isActive={true}
                      onQuoteSelect={handleQuoteSelect}
                      personaName={connectedSession?.personaData?.name ?? null}
                    />
                  </TabsContent>
                  
                  <TabsContent value="evaluation" className="mt-2 flex-1 overflow-hidden border rounded-md bg-gray-50">
                     <EvaluationTab />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
            
            <div className="lg:col-span-4 flex flex-col overflow-hidden">
              <FeedbackWindow 
                sessionId={connectedSession.id} 
                isActive={true} 
                selectedQuote={selectedQuote}
                onMessageSent={clearSelectedQuote}
                currentUserType="faculty"
                title="Student/Faculty Chat"
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default FacultyDashboard;
