import assert from "node:assert/strict";
import { test } from "node:test";

import { SessionManager } from "./sessionManager";
import type { PersonaData } from "../types/session";

const persona: PersonaData = {
  id: "test-persona",
  scenario: "Test scenario",
  name: "Test Patient",
  age: 50,
  diagnosis: "Synthetic diagnosis",
  scenario_goal: "Practice communication",
  system_prompt: "Act as the synthetic patient.",
  background: { clinical: "Clinical context", emotional: "Concerned" },
  mge_nodes: { emotion_nodes: [], topic_nodes: [] },
  conversational_milestones: [],
  empathetic_engagement: { guidance: [], example_phrases: [] },
  conclusion: { summary: "Complete", closing_quote: "Thank you." },
};

test("manages the complete session lifecycle", () => {
  const manager = new SessionManager();
  const session = manager.createSession("student-1", persona);

  assert.match(session.id, /^[a-f0-9]{8}$/);
  assert.equal(session.active, true);
  assert.equal(manager.addFaculty(session.id, "faculty-1"), true);
  assert.deepEqual(session.connectedFaculty, ["faculty-1"]);

  manager.addMessage({
    sessionId: session.id,
    senderId: "student-1",
    type: "student",
    content: "Hello",
    timestamp: new Date().toISOString(),
  });
  const messages = manager.getMessages(session.id);
  assert.equal(messages.length, 1);
  messages.length = 0;
  assert.equal(manager.getMessages(session.id).length, 1);

  assert.equal(manager.endSession(session.id), true);
  assert.equal(manager.endSession(session.id), false);
  assert.equal(manager.addFaculty(session.id, "faculty-2"), false);
});
