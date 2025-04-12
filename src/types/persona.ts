// Define shared persona types

export interface PersonaBackground {
  clinical: string;
  emotional: string;
}

export interface MgeNodes {
  emotion_nodes: string[];
  topic_nodes: string[];
}

export interface ConversationalMilestone {
  milestone: string;
  student_prompt?: string; 
  ai_response: string;
  tone: string;
}

export interface EmpatheticEngagement {
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
  conversation_enabled?: boolean;
  background: PersonaBackground;
  mge_nodes: MgeNodes;
  conversational_milestones: ConversationalMilestone[];
  empathetic_engagement: EmpatheticEngagement;
  conclusion: { summary: string; closing_quote: string; };
}
