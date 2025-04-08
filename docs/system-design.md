# Conversational Training Tool for APRN Students

## System Overview
The Conversational Training Tool is a voice-based chatbot system designed to help APRN (Advanced Practice Registered Nurse) students practice emotional and sensitive conversations with patients. The system enables real-time faculty monitoring and feedback during these practice sessions. The AI interaction model is inspired by the GuideLLM framework (arxiv.org/abs/2502.06494), focusing on goal navigation, context management, and empathetic engagement within faculty-defined scenarios.

## Core Components

### 1. Student Interface
- **Persona Selection**: Dropdown menu populated from YAML files in `/personas` directory (loads full persona data on selection).
- **Conversation Controls**: Start/Stop button for voice interactions.
- **Chat Display**: Real-time transcription of AI/patient voice conversation.
- **Faculty Feedback Panel**: Separate text-based communication channel with observing faculty.
- **Session Management**: Unique session ID generation and sharing functionality.

### 2. Faculty Dashboard
- **Session Connection**: Interface to connect to student sessions using session IDs.
- **Real-time Monitoring**: View of student-patient conversation transcript.
- **Feedback Interface**: Text-based communication channel with students.
- **Session Management**: List of active sessions and connection status.

### 3. Backend Services

#### Relay Server
- **WebSocket Server**: Handles real-time communication between components.
- **Session Management**: Creates and maintains session state, including storing selected `personaData`.
- **Message Routing**: Routes messages between students, faculty, and the Hume AI/LLM service.

#### Hume AI Integration & LLM Interaction Model

This component leverages Hume AI for its core speech-to-text and text-to-speech capabilities. The underlying LLM's conversational behavior is guided by principles adapted from the GuideLLM framework:

- **Speech-to-Text:** Real-time transcription of student voice input via Hume AI.
- **Text-to-Speech:** Voice response generation for patient personas via Hume AI, potentially leveraging Hume's EVI features for emotional expression.
- **Goal Navigation (Adapted):** 
    - Uses faculty-authored scenario scripts (from `/personas` YAML files) containing key conversational milestones, talking points, and desired patient emotional states.
    - The LLM is prompted to generate contextually appropriate patient responses that align with the persona's background and goals, subtly guiding the conversation towards the defined milestones or key topics when appropriate, without rigidly adhering to a script (inspired by GuideLLM's goal-oriented approach, but student-led).
- **Context Management (MGE-Inspired):**
    - The backend maintains conversational context by tracking the interaction history and potentially summarizing key topics discussed and emotional trends (inspired by GuideLLM's Memory Graph Extrapolation concept).
    - This context (raw history or summary) is included in prompts to the LLM to ensure conversational continuity and realism.
- **Empathetic Engagement:**
    - Inspired by GuideLLM's focus on empathy, the AI's emotional tone and responsiveness are guided by detailed instructions and cues embedded in the persona file (e.g., background, guidance, example phrases).
    - These instructions are reinforced in the system prompt and potentially updated via context summaries sent to the LLM.

#### LLM Prompt Construction Strategy (Per Turn)

To generate each AI patient response, the backend constructs a detailed prompt for the LLM. This prompt dynamically combines static persona information with dynamic conversational context:

1.  **System Prompt (Base):**
    *   Derived from the selected persona's YAML (`personaData` stored in the session).
    *   Includes: Persona identity (`name`, `age`, `scenario`, `diagnosis`), background (`clinical`, `emotional`), core MGE nodes (`emotion_nodes`, `topic_nodes`), and detailed empathetic engagement guidance (`guidance`, `example_phrases`).
    *   Example Structure: "You are [Name], a [Age]-year-old... You feel [emotional background]... Your key concerns are [emotion_nodes]... Speak according to the following guidance: [empathy guidance]..."

2.  **Conversation History:**
    *   Includes the last N (e.g., 5-10) turns of the student-AI conversation transcript.
    *   Format: `Student: ... \n AI: ... \n Student: ...`

3.  **Context Summary (Optional/Future Enhancement):**
    *   A condensed summary of the conversation state, potentially generated periodically.
    *   Could track: Topics covered, expressed student/AI emotions, progress towards persona goals.
    *   Included alongside or instead of raw history for longer conversations.

4.  **Goal Navigation Elements (Dynamic & Optional):**
    *   **Few-Shot Milestone Examples:** Include 1-2 relevant `conversational_milestones` from the persona YAML as examples of how the persona might react in similar situations presented by the student.
    *   **Gentle Guidance Instruction:** Add a subtle instruction like "If appropriate, gently steer towards discussing [relevant topic_node or next milestone theme]."

5.  **Current Student Input:**
    *   The latest transcribed text utterance from the student (provided by Hume STT).

6.  **Final Instruction:**
    *   A concluding instruction guiding the LLM, e.g., "Generate the next response for [Persona Name], staying in character based on the persona, conversation history, and empathetic guidance. Ensure the response is empathetic and natural."

This structured prompt allows the LLM to generate responses that are contextually relevant, persona-consistent, emotionally appropriate, and subtly guided towards the learning objectives defined in the faculty-authored scenarios.

## Technical Architecture

### Frontend Routes
```
/                           # Student main interface
/faculty-dashboard          # Faculty monitoring interface
```

### WebSocket Events
```
# Student -> Server
- START_SESSION { studentId: string, personaData: object } // Send full persona data
- END_SESSION { sessionId: string }
- VOICE_INPUT { sessionId: string, audioChunk: Blob } // For streaming STT
- TEXT_MESSAGE { sessionId: string, type: 'student', content: string } // Student->Faculty chat

# Server -> Student / Faculty (in session room)
- SESSION_CREATED { session: Session } // Send full session object with personaData
- JOINED_SESSION { session: Session } // Send full session object with personaData
- MESSAGE_HISTORY { messages: Message[] }
- NEW_MESSAGE { message: Message } // Includes student, ai, faculty types
- SESSION_ENDED { sessionId: string }
- TRANSCRIPTION_UPDATE { text: string, isFinal: boolean } // For live transcription display
- AI_RESPONSE_AUDIO { audioChunk: Blob } // For streaming AI audio response
- ERROR { message: string }

# Faculty -> Server
- JOIN_SESSION { sessionId: string, facultyId: string }
- TEXT_MESSAGE { sessionId: string, type: 'faculty', content: string } // Faculty->Student chat

# Server -> Specific Faculty Socket
# (Potentially useful for specific dashboard updates, TBD)
```

### API Endpoints
```
GET  /api/personas                  # Get list of available persona IDs/names
GET  /api/personas/:id             # Get full YAML content for a specific persona (alternative to loading on frontend)
# Other API endpoints (e.g., for auth) TBD
```

## Data Flow

1.  **Session Initialization**
    *   Student selects persona, frontend loads and parses YAML.
    *   Student clicks start, frontend sends `START_SESSION` with `studentId` and full `personaData` object.
    *   Backend creates session, stores `personaData`, generates unique session ID.
    *   Backend emits `SESSION_CREATED` with the full session object (including ID and `personaData`) back to the student.
    *   Student shares session ID with faculty.

2.  **Conversation Flow (Student perspective)**
    *   Student speaks.
    *   Frontend captures audio, sends `VOICE_INPUT` chunks via WebSocket.
    *   Backend forwards audio chunks to Hume STT.
    *   Hume sends transcription updates; Backend relays `TRANSCRIPTION_UPDATE` to room.
    *   On final transcription, Backend constructs LLM prompt using stored `personaData`, history, etc.
    *   Backend sends prompt to LLM (potentially Hume EVI or another model).
    *   LLM generates text response.
    *   Backend sends text response to Hume TTS.
    *   Hume sends audio chunks; Backend relays `AI_RESPONSE_AUDIO` chunks to room.
    *   Backend saves Student transcription and AI response text as `Message` objects (`type: 'student'`, `type: 'ai'`) and emits `NEW_MESSAGE` for both.
    *   Frontend renders transcription in `ConversationWindow`, plays AI audio, updates chat log (`ConversationWindow` with AI message, `FeedbackWindow` with Student message).

3.  **Faculty Monitoring & Chat**
    *   Faculty enters session ID, clicks Join.
    *   Frontend sends `JOIN_SESSION`.
    *   Backend validates ID, adds faculty to session room, retrieves session data.
    *   Backend emits `JOINED_SESSION` with full session object back to faculty.
    *   Backend emits `MESSAGE_HISTORY` to faculty.
    *   Faculty views `ConversationWindow` (populated by messages from context) and `FeedbackWindow` (filtered for student/faculty chat).
    *   Faculty types chat message, frontend sends `TEXT_MESSAGE` (`type: 'faculty'`).
    *   Backend saves message, emits `NEW_MESSAGE` to room.
    *   Student types chat message, frontend sends `TEXT_MESSAGE` (`type: 'student'`).
    *   Backend saves message, emits `NEW_MESSAGE` to room.

## Security Considerations
- WebSocket connections require authentication (TBD).
- Session IDs should be unguessable and ideally time-limited or single-use for joining.
- Faculty access may require separate authentication.
- All communications should ideally be encrypted (WSS/HTTPS).

## Implementation Phases

### Phase 1: Core Infrastructure (Mostly Done)
- Set up WebSocket server.
- Implement session management (including personaData storage).
- Create basic UI components and student/faculty connection flow.
- Implement student/faculty text chat.

### Phase 2: Hume AI & LLM Integration
- Integrate Hume STT (frontend audio capture, backend streaming).
- Implement backend LLM prompt construction and interaction.
- Integrate Hume TTS (backend streaming, frontend audio playback).
- Display transcript and AI messages in `ConversationWindow`.

### Phase 3: Refinements & Faculty Features
- Add metrics/analysis tab functionality.
- Refine UI/UX based on testing.
- Implement authentication/authorization if needed.

### Phase 4: Testing & Deployment
- User testing with students and faculty.
- Performance optimization.
- Prepare for deployment.

## Technical Requirements
- Node.js backend
- React frontend
- WebSocket support (Socket.IO)
- Hume AI API access
- YAML parsing library (js-yaml)
- Potential LLM API access (if not using Hume EVI directly for generation)
- Secure authentication system (optional, TBD)
- Real-time audio processing capabilities