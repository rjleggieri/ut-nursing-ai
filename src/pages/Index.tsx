import { useState } from 'react';
import Header from '@/components/Header';
import PersonaSelector from '@/components/PersonaSelector';
import SessionInfo from '@/components/SessionInfo';
import ConversationControl from '@/components/ConversationControl';
import FeedbackWindow from '@/components/FeedbackWindow';
import PatientProfileDisplay from '@/components/PatientProfileDisplay';
import { useSocket } from '@/contexts/SocketContext';
import { PersonaData } from '@/types/persona';

const Index = () => {
  const [selectedPersona, setSelectedPersona] = useState<PersonaData | null>(null);
  const { session, messages } = useSocket();
  const conversationActive = !!session;
  const sessionId = session?.id || '';

  const handlePersonaSelected = (persona: PersonaData | null) => {
    if (!session) {
      setSelectedPersona(persona);
    } else {
      console.warn("Cannot change persona while conversation is active.");
    }
  };

  return (
    <div className="min-h-screen bg-utexas-gray flex flex-col">
      <Header />
      
      <main className="container flex-1 pb-8 flex flex-col overflow-hidden">
        <h1 className="text-2xl font-bold mb-6 text-utexas-navy flex-shrink-0">
          Conversational Training Tool for APRN Students
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 overflow-hidden">
          {/* Left column - Controls & Faculty Chat */}
          <div className="lg:col-span-4 space-y-4 flex flex-col overflow-hidden">
            <PersonaSelector 
              onPersonaSelected={handlePersonaSelected} 
              disabled={conversationActive}
            />
            <SessionInfo sessionId={sessionId} />
            <ConversationControl 
              selectedPersona={selectedPersona}
            />
            <div className="flex-1 min-h-0">
              <FeedbackWindow sessionId={sessionId} isActive={conversationActive} />
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
