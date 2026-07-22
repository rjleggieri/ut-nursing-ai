import { useState } from "react";

import ConversationControl from "@/components/ConversationControl";
import FeedbackWindow from "@/components/FeedbackWindow";
import Header from "@/components/Header";
import PatientProfileDisplay from "@/components/PatientProfileDisplay";
import PersonaSelector from "@/components/PersonaSelector";
import SessionInfo from "@/components/SessionInfo";
import { useSocket } from "@/hooks/useSocket";
import type { PersonaData } from "@/types/persona";

export default function Index() {
  const [selectedPersona, setSelectedPersona] = useState<PersonaData | null>(null);
  const { messages, session } = useSocket();
  const isActive = Boolean(session);
  const sessionId = session?.id ?? "";
  const feedbackMessages = messages.filter(
    (message) =>
      message.sessionId === sessionId &&
      (message.type === "student" || message.type === "faculty"),
  );

  return (
    <div className="flex min-h-screen flex-col bg-utexas-gray">
      <Header />
      <main className="container flex flex-1 flex-col lg:h-[calc(100vh-11rem)] lg:overflow-hidden">
        <h1 className="mb-6 flex-shrink-0 text-2xl font-bold text-utexas-navy">
          CareSpeak: APRN Communication Training
        </h1>

        <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-12 lg:overflow-hidden">
          <div className="flex flex-col lg:col-span-4 lg:overflow-hidden">
            <div className="mb-4">
              <PersonaSelector
                onPersonaSelected={setSelectedPersona}
                disabled={isActive}
              />
            </div>
            <div className="mb-4"><SessionInfo sessionId={sessionId} /></div>
            <div className="mb-4"><ConversationControl selectedPersona={selectedPersona} /></div>
            <div className="min-h-[20rem] flex-1 lg:min-h-0">
              <FeedbackWindow
                messages={feedbackMessages}
                isActive={isActive}
                currentUserType="student"
                title="Faculty Chat"
              />
            </div>
          </div>

          <div className="min-h-[28rem] lg:col-span-8 lg:min-h-0 lg:overflow-hidden">
            <PatientProfileDisplay persona={selectedPersona} />
          </div>
        </div>
      </main>
    </div>
  );
}
