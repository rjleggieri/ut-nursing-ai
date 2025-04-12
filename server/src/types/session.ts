// Import necessary types from the frontend definition (adjust path if needed)
// We need a way to share this type definition - copying for now is okay but not ideal
// Ideally, create a shared types package or use tsconfig paths
interface PersonaBackground {
  clinical: string;
  emotional: string;
}
interface MgeNodes {
  emotion_nodes: string[];
  topic_nodes: string[];
}
interface ConversationalMilestone {
  milestone: string;
  student_prompt?: string; 
  ai_response: string;
  tone: string;
}
interface EmpatheticEngagement {
  guidance: string[];
  example_phrases: string[];
}
export interface PersonaData {
  id: string;
  scenario: string;
  name: string;
  age: number;
  diagnosis: string;
  scenario_goal: string;
  system_prompt: string;
  voice_id?: string;
  config_id?: string;
  background: PersonaBackground;
  mge_nodes: MgeNodes;
  conversational_milestones: ConversationalMilestone[];
  empathetic_engagement: EmpatheticEngagement;
  conclusion: { summary: string; closing_quote: string; };
}

export interface Session {
  id: string;
  studentId: string;
  // Replace simple persona name with the full data object
  // persona: string; 
  personaData: PersonaData | null; // Store the full persona data object
  startTime: Date;
  active: boolean;
  connectedFaculty: string[];
}

export interface Message {
  sessionId: string;
  senderId: string; // 'student123', 'faculty456', 'HUME_AI'
  // Add 'transcription' type
  type: 'student' | 'ai' | 'faculty' | 'transcription'; 
  content: string;
  timestamp: Date;
} 