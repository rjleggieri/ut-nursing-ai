import { useState, useRef, useEffect } from 'react';
import { Search, Clipboard, ArrowRight, Loader2, Save, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/lib/toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/Header';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useSocket } from '@/contexts/SocketContext';
import ConversationWindow from '@/components/ConversationWindow';
import { Session, ClientMessage } from '@/contexts/SocketContext';
import { formatTimestamp } from '@/lib/utils';
import FeedbackWindow from '@/components/FeedbackWindow';
import EvaluationTab from '@/components/EvaluationTab';

// Define evaluation criteria and component here
/*
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

// Modify EvaluationTab signature to accept props
interface EvaluationTabProps {
  scores: Record<number, string>;
  setScores: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  notes: string;
  setNotes: React.Dispatch<React.SetStateAction<string>>;
}

const EvaluationTab = ({ scores, setScores, notes, setNotes }: EvaluationTabProps) => {
  return (
    <ScrollArea className="h-full p-4">
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
                    // Add checked and onChange
                    checked={scores[index] === option}
                    onChange={(e) => setScores(prev => ({ ...prev, [index]: e.target.value }))}
                  />
                  {option}
                </label>
              ))}
            </div>
          </div>
        ))}
        
        <div className="bg-white rounded-lg p-4 shadow-sm border">
           <h3 className="font-semibold text-lg mb-2 text-utexas-navy">Additional Notes</h3>
           <Textarea 
             placeholder="Enter any additional feedback or observations here..."
             rows={5}
             className="text-sm"
             // Add value and onChange
             value={notes}
             onChange={(e) => setNotes(e.target.value)}
           />
         </div>
      </div>
    </ScrollArea>
  );
};
*/

// Define Session Status type
type SessionStatus = 'disconnected' | 'connecting' | 'connected' | 'ended';

const FacultyDashboard = () => {
  const [inputSessionId, setInputSessionId] = useState('');
  const [selectedQuote, setSelectedQuote] = useState<string | null>(null);
  const { 
    joinSession, 
    session: contextSession,
    messages: allMessages, 
    sendMessage, 
    isConnected: socketConnected 
  } = useSocket();
  
  // State to hold the session data *after* successful connection, even if context clears
  const [connectedSession, setConnectedSession] = useState<Session | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('disconnected');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Add state for Evaluation Tab
  const [evaluationScores, setEvaluationScores] = useState<Record<number, string>>({});
  const [evaluationNotes, setEvaluationNotes] = useState<string>('');

  // Add state for local, persistent session messages
  const [sessionMessages, setSessionMessages] = useState<ClientMessage[]>([]);

  // Effect to append new messages to local state
  useEffect(() => {
    if (connectedSession?.id) {
      // Create a Set of existing message IDs for quick lookup
      const existingMessageIds = new Set(sessionMessages.map(m => m.timestamp + m.senderId)); // Use timestamp+senderId as unique key
      
      // Filter allMessages from context for NEW messages belonging to the connected session
      const newMessages = allMessages.filter(msg => 
        msg.sessionId === connectedSession.id && 
        !existingMessageIds.has(msg.timestamp + msg.senderId)
      );

      // If new messages are found, append them
      if (newMessages.length > 0) {
        console.log(`[Message Effect] Appending ${newMessages.length} new messages.`);
        setSessionMessages(prev => [...prev, ...newMessages]);
      }
    }
    // This effect runs whenever the messages from the context change.
    // It ensures we capture messages even if they arrive slightly after connection.
  }, [allMessages, connectedSession?.id]); // Rerun when context messages or connected session ID changes

  // Filter local sessionMessages for display in ConversationWindow
  const conversationMessages = sessionMessages.filter((msg): msg is ClientMessage => 
    msg.type === 'ai' || msg.type === 'transcription'
  );
  
  // Filter local sessionMessages for display in FeedbackWindow
  const feedbackMessages = sessionMessages.filter((msg): msg is ClientMessage => 
    msg.type === 'student' || msg.type === 'faculty'
  );

  // Effect to handle session status changes 
  useEffect(() => {
    const activeSessionId = connectedSession?.id;

    if (sessionStatus === 'connecting') {
      if (contextSession?.id === inputSessionId.trim()) {
        console.log('Connection successful, setting status to connected');
        setConnectedSession(contextSession);
        setSessionStatus('connected');
        setConnectionError(null);
        
        // Initial load of messages - ADD SAFETY CHECK for allMessages
        const initialMessages = Array.isArray(allMessages) 
            ? allMessages.filter(msg => msg.sessionId === contextSession.id)
            : []; // Default to empty array if allMessages is not an array
        console.log(`[Status Effect] Initial message load: ${initialMessages.length} messages.`);
        setSessionMessages(initialMessages);
        
        toast.success("Connected to student session", { description: `Session ID: ${contextSession.id}` });
      } 
    } else if (sessionStatus === 'connected') {
      if (!contextSession || contextSession.id !== activeSessionId) {
        console.log('Detected session end in context.');
        setSessionStatus('ended');
        toast.info("Student session has ended", { description: "You can finish evaluation and save." });
      }
    }
  }, [contextSession, sessionStatus, inputSessionId, connectedSession, allMessages]); // Added allMessages dependency for initial load

  // Effect for connection timeout (moved from previous effect)
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (sessionStatus === 'connecting') {
       timer = setTimeout(() => {
         // If still connecting after timeout, mark as disconnected
         if (sessionStatus === 'connecting') {
            console.log('Connection attempt timed out');
            setSessionStatus('disconnected');
            setConnectionError('Connection attempt timed out. Please check the ID and try again.');
            toast.error('Connection Failed', { description: 'Could not connect to the session.' });
         }
       }, 10000); // 10 second timeout
    }
    // Cleanup timeout if status changes or component unmounts
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [sessionStatus]);

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
    setSessionStatus('connecting'); // Set status to connecting
    setConnectedSession(null); // Clear previous session data
    setConnectionError(null); 
    // Clear evaluation AND local messages for new session attempt
    setEvaluationScores({}); 
    setEvaluationNotes('');
    setSessionMessages([]); 
    joinSession(trimmedSessionId, facultyId);
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

  // Add handleSaveSession function
  const handleSaveSession = () => {
    if (!connectedSession) return;

    // Use local sessionMessages for transcript/chat logs
    const currentConversationTranscript = sessionMessages
      .filter(msg => msg.type === 'ai' || msg.type === 'transcription')
      .map(msg => ({ 
        timestamp: msg.timestamp,
        speaker: msg.type === 'ai' ? `Patient (${connectedSession.personaData?.name ?? 'AI'})` : 'APRN Student',
        content: msg.content
      }));

    const currentFacultyStudentChat = sessionMessages
       .filter(msg => msg.type === 'student' || msg.type === 'faculty')
       .map(msg => ({ 
        timestamp: msg.timestamp,
        speaker: msg.type === 'faculty' ? 'Faculty' : 'Student',
        content: msg.content
      }));

    const sessionData = {
      sessionId: connectedSession.id,
      studentId: connectedSession.studentId,
      personaName: connectedSession.personaData?.name ?? 'Unknown',
      startTime: connectedSession.startTime,
      endTime: Date.now(), 
      conversationTranscript: currentConversationTranscript,
      facultyStudentChat: currentFacultyStudentChat,
      // Save evaluation scores and notes directly from state
      evaluation: {
        scores: evaluationScores, // Save the scores object {0: "Good", 1: "Fair", ...}
        notes: evaluationNotes
      }
    };
    
    const jsonString = JSON.stringify(sessionData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `session-${connectedSession.id}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Session data downloaded successfully!');
  };

  // Function to manually disconnect/clear the faculty view
  const handleDisconnect = () => {
    console.log('Manual disconnect initiated');
    setSessionStatus('disconnected');
    setConnectedSession(null);
    setInputSessionId(''); // Clear the input field
    setEvaluationScores({});
    setEvaluationNotes('');
    setConnectionError(null);
    // Clear local messages on manual disconnect
    setSessionMessages([]);
    toast.info("Disconnected from session view.");
  };

  return (
    <div className="h-full bg-utexas-gray flex flex-col">
      <Header />
      
      <main className="container mx-auto flex-1 py-4 flex flex-col overflow-hidden">
        <h1 className="text-xl font-bold mb-4 text-utexas-navy flex-shrink-0">Faculty Dashboard</h1>
        
        {/* Render Connection Prompt OR Dashboard based on status */} 
        {(sessionStatus === 'disconnected' || sessionStatus === 'connecting') ? (
          // Show Connection Prompt Area if disconnected OR connecting
          <div className="flex-1 flex items-center justify-center">
             <div className="w-full max-w-md bg-white rounded-lg shadow p-6">
               <h2 className="text-lg font-medium mb-4">Connect to Student Session</h2>
               
               <div className="flex items-center space-x-2 mb-6">
                 <div className="flex-1">
                   <Input
                     value={inputSessionId}
                     onChange={(e) => setInputSessionId(e.target.value)}
                     placeholder="Enter Session ID"
                     // Disable input ONLY when actively connecting
                     disabled={sessionStatus === 'connecting'} 
                   />
                 </div>
                 <Button
                   size="icon"
                   variant="outline"
                   onClick={handlePasteFromClipboard}
                   title="Paste from clipboard"
                   // Disable button ONLY when actively connecting
                   disabled={sessionStatus === 'connecting'}
                 >
                   <Clipboard className="h-4 w-4" />
                 </Button>
               </div>
               
               {connectionError && sessionStatus === 'disconnected' && (
                   // Show error only if disconnected (not during connecting attempt)
                   <p className="text-sm text-red-600 mb-4 text-center">{connectionError}</p>
               )}
               
               <Button 
                 className="w-full" 
                 onClick={handleConnect} 
                 // Disable button while connecting OR if input is empty/socket down
                 disabled={sessionStatus === 'connecting' || !inputSessionId.trim() || !socketConnected}
               >
                 {/* Show Loader OR Icon based on connecting status */} 
                 {sessionStatus === 'connecting' ? (
                   <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                 ) : (
                   <Search className="mr-2 h-4 w-4" />
                 )}
                 {/* Show Text based on connecting status */} 
                 {sessionStatus === 'connecting' ? 'Connecting...' : 'Connect to Session'}
               </Button>
             </div>
           </div>
        ) : (
          /* Show main dashboard ONLY when connected or ended */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 overflow-hidden">
            <div className="lg:col-span-8 flex flex-col overflow-hidden">
              <div className="bg-white p-4 rounded-lg shadow flex-1 flex flex-col overflow-hidden h-full">
                {/* Header */} 
                <div className="flex-shrink-0 mb-3 flex justify-between items-start">
                  <div>
                    <h2 className="font-semibold text-lg">Student Session: {connectedSession?.id ?? 'Error'}</h2> {/* Should have ID here */}
                    <div className={`flex items-center text-sm mt-1 ${sessionStatus === 'connected' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      <div className={`h-2 w-2 rounded-full mr-2 ${sessionStatus === 'connected' ? 'bg-emerald-600' : 'bg-amber-600'}`}></div>
                      {/* Status is only connected or ended in this block */} 
                      {sessionStatus === 'connected' ? 'Connected' : 'Session Ended'}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleSaveSession} 
                        // Disable check simplified as status must be connected/ended here
                        disabled={!connectedSession}
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Save Session
                      </Button>
                      {/* Disconnect Button - Always show if in this state */} 
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={handleDisconnect}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Disconnect
                      </Button>
                  </div>
                </div>
                {/* Tabs */} 
                <Tabs defaultValue="conversation" className="w-full flex flex-col flex-1 min-h-0">
                  <TabsList className="grid grid-cols-2 flex-shrink-0">
                    <TabsTrigger value="conversation">Live Conversation</TabsTrigger>
                    <TabsTrigger value="evaluation">Evaluation</TabsTrigger> 
                  </TabsList>
                  <TabsContent value="conversation" className="mt-2 flex-1 overflow-hidden">
                    <ConversationWindow 
                      messages={conversationMessages}
                      isActive={sessionStatus === 'connected'} 
                      onQuoteSelect={handleQuoteSelect}
                      personaName={connectedSession?.personaData?.name ?? null}
                    />
                  </TabsContent>
                  <TabsContent value="evaluation" className="mt-2 flex-1 overflow-hidden border rounded-md bg-gray-50">
                     <EvaluationTab 
                       scores={evaluationScores}
                       setScores={setEvaluationScores}
                       notes={evaluationNotes}
                       setNotes={setEvaluationNotes}
                     />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
            {/* Right Pane */} 
            <div className="lg:col-span-4 flex flex-col overflow-hidden">
              <FeedbackWindow 
                messages={feedbackMessages}
                sessionId={connectedSession?.id ?? ''} 
                isActive={sessionStatus === 'connected'} 
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
