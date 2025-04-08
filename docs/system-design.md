# Conversational Training Tool for APRN Students

## System Overview
The Conversational Training Tool is a voice-based chatbot system designed to help APRN (Advanced Practice Registered Nurse) students practice emotional and sensitive conversations with patients. The system enables real-time faculty monitoring and feedback during these practice sessions.

## Core Components

### 1. Student Interface
- **Persona Selection**: Dropdown menu populated from YAML files in `/personas` directory
- **Conversation Controls**: Start/Stop button for voice interactions
- **Chat Display**: Real-time transcription of voice conversations
- **Faculty Feedback Panel**: Text-based communication with observing faculty
- **Session Management**: Unique session ID generation and sharing functionality

### 2. Faculty Dashboard
- **Session Connection**: Interface to connect to student sessions using session IDs
- **Real-time Monitoring**: View of student-patient conversation
- **Feedback Interface**: Text-based communication channel with students
- **Session Management**: List of active sessions and connection status

### 3. Backend Services

#### Relay Server
- **WebSocket Server**: Handles real-time communication between components
- **Session Management**: Creates and maintains session state
- **Message Routing**: Routes messages between students, faculty, and Hume AI

#### Hume AI Integration
- **Speech-to-Text**: Real-time transcription of student voice input
- **Text-to-Speech**: Voice response generation for patient personas
- **Conversation Management**: Maintains context and conversation flow

## Technical Architecture

### Frontend Routes
```
/                           # Student main interface
/faculty-dashboard          # Faculty monitoring interface
```

### WebSocket Events
```
# Student -> Server
- START_SESSION
- END_SESSION
- VOICE_INPUT
- TEXT_MESSAGE

# Server -> Student
- TRANSCRIPTION
- PATIENT_RESPONSE
- FACULTY_FEEDBACK

# Faculty -> Server
- CONNECT_TO_SESSION
- SEND_FEEDBACK

# Server -> Faculty
- SESSION_UPDATE
- STUDENT_MESSAGE
```

### API Endpoints
```
POST /api/sessions/create           # Create new session
POST /api/sessions/:id/connect      # Connect to existing session
POST /api/sessions/:id/transcribe   # Send voice for transcription
POST /api/sessions/:id/feedback     # Send faculty feedback
GET  /api/personas                  # Get available personas
```

## Data Flow

1. **Session Initialization**
   - Student selects persona
   - System generates unique session ID
   - Student shares ID with faculty

2. **Conversation Flow**
   - Student starts conversation
   - Voice input → WebSocket → Relay Server
   - Relay Server → Hume AI for processing
   - Hume AI response → Relay Server → Student
   - All interactions logged in chat display

3. **Faculty Monitoring**
   - Faculty enters session ID
   - Connects to WebSocket
   - Receives real-time updates
   - Can send text feedback

## Security Considerations
- WebSocket connections require authentication
- Session IDs are unique and time-limited
- Faculty access requires valid credentials
- All communications are encrypted

## Implementation Phases

### Phase 1: Core Infrastructure
- Set up WebSocket server
- Implement session management
- Create basic UI components

### Phase 2: Hume AI Integration
- Implement speech-to-text
- Implement text-to-speech
- Set up conversation context management

### Phase 3: Faculty Features
- Develop faculty dashboard
- Implement real-time monitoring
- Add feedback system

### Phase 4: Testing & Refinement
- User testing with students
- Faculty feedback integration
- Performance optimization

## Technical Requirements
- Node.js backend
- React frontend
- WebSocket support
- Hume AI API access
- Secure authentication system
- Real-time audio processing capabilities
