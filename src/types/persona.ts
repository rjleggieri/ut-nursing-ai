
// Define types for the persona YAML structure
export interface Persona {
  id: string;
  scenario: string;
  name: string;
  age: number;
  diagnosis: string;
  scenario_goal: string;
  background: {
    clinical: string;
    emotional: string;
  };
  mge_nodes: {
    emotion_nodes: string[];
    topic_nodes: string[];
  };
  conversational_milestones: {
    milestone: string;
    student_prompt: string;
    ai_response: string;
    tone: string;
  }[];
  empathetic_engagement: {
    guidance: string[];
    example_phrases: string[];
  };
  conclusion: {
    summary: string;
    closing_quote: string;
  };
}
