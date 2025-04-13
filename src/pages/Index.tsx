import { useState } from 'react';
import Header from '@/components/Header';
import PersonaSelector from '@/components/PersonaSelector';
import SessionInfo from '@/components/SessionInfo';
import ConversationControl from '@/components/ConversationControl';
import FeedbackWindow from '@/components/FeedbackWindow';
import PatientProfileDisplay from '@/components/PatientProfileDisplay';
import { useSocket } from '@/contexts/SocketContext';
import { PersonaData } from '@/types/persona';
import { ClientMessage } from '@/contexts/SocketContext';

const Index = () => {
  const [selectedPersona, setSelectedPersona] = useState<PersonaData | null>(null);
  const { session, messages: allMessages } = useSocket();
  const conversationActive = !!session;
  const sessionId = session?.id || '';

  const handlePersonaSelected = (persona: PersonaData | null) => {
    if (!session) {
      setSelectedPersona(persona);
    } else {
      console.warn("Cannot change persona while conversation is active.");
    }
  };

  const feedbackMessages = Array.isArray(allMessages) ? allMessages.filter((msg): msg is ClientMessage => 
    msg.sessionId === sessionId && (msg.type === 'student' || msg.type === 'faculty')
  ) : [];

  return (
    <div className="min-h-screen bg-utexas-gray flex flex-col">
      <Header />
      
      <main 
        className="container flex flex-col overflow-hidden"
        style={{ height: 'calc(100vh - 11rem)' }}
      >
        <h1 className="text-2xl font-bold mb-6 text-utexas-navy flex-shrink-0">
          Conversational Training Tool for APRN Students
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full overflow-hidden">
          {/* Left column - Controls & Faculty Chat */}
          <div className="lg:col-span-4 flex flex-col overflow-hidden">
            <div className="mb-4">
              <PersonaSelector 
                onPersonaSelected={handlePersonaSelected} 
                disabled={conversationActive}
              />
            </div>
            <div className="mb-4">
              <SessionInfo 
                sessionId={sessionId} 
              />
            </div>
            <div className="mb-4">
              <ConversationControl 
                selectedPersona={selectedPersona}
              />
            </div>
            
            <div className="flex-1 min-h-0"> 
              <FeedbackWindow 
                messages={feedbackMessages}
                sessionId={sessionId} 
                isActive={conversationActive} 
                currentUserType="student"
                title="Faculty Chat" 
              />
            </div>
          </div>
          
          {/* Right column - Patient Profile Display */}
          <div className="lg:col-span-8 overflow-hidden">
            <PatientProfileDisplay persona={selectedPersona} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
