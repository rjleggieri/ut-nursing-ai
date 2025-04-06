
import { useState } from 'react';
import Header from '@/components/Header';
import PersonaSelector from '@/components/PersonaSelector';
import SessionInfo from '@/components/SessionInfo';
import ConversationControl from '@/components/ConversationControl';
import ConversationWindow from '@/components/ConversationWindow';
import FeedbackWindow from '@/components/FeedbackWindow';
import { Persona } from '@/types/persona';

const Index = () => {
  const [selectedPersona, setSelectedPersona] = useState<Partial<Persona> | null>(null);
  const [conversationActive, setConversationActive] = useState(false);
  const [sessionId, setSessionId] = useState('');

  const handlePersonaSelected = (persona: Partial<Persona>) => {
    setSelectedPersona(persona);
  };

  return (
    <div className="min-h-screen bg-utexas-gray flex flex-col">
      <Header />
      
      <main className="container flex-1 pb-8">
        <h1 className="text-2xl font-bold mb-6 text-utexas-navy">
          Conversational Training Tool for APRN Students
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left column - Controls */}
          <div className="lg:col-span-3 space-y-6">
            <PersonaSelector onPersonaSelected={handlePersonaSelected} />
            <SessionInfo />
            <ConversationControl onStatusChange={setConversationActive} />
          </div>
          
          {/* Right column - Conversation & Feedback */}
          <div className="lg:col-span-9 grid grid-rows-2 gap-6 h-[calc(100vh-200px)]">
            <ConversationWindow isActive={conversationActive} />
            <FeedbackWindow sessionId={sessionId} isActive={conversationActive} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
