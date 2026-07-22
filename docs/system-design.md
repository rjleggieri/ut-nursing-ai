# CareSpeak system design

This document describes the archived prototype as implemented. CareSpeak has two React routes backed by a Node.js Socket.IO relay and Hume AI's Empathic Voice Interface (EVI).

## Runtime components

### Student interface

- Loads the four known YAML personas from `public/personas` through `personaService`.
- Starts a session with a browser-scoped synthetic participant ID and the selected persona.
- Captures microphone audio with `MediaRecorder`, converts chunks to base64, and streams them to the server.
- Plays AI audio through a queue managed by `useAudioPlayback`.
- Displays the session ID and a separate student/faculty chat.

### Faculty dashboard

- Joins an active session by its eight-character ID.
- Maintains local copies of transcript and chat messages.
- Preserves those copies, evaluation scores, and notes after the student session ends.
- Exports a structured JSON record in the browser.

### Relay server

- `index.ts` configures Express, the health endpoint, CORS, and Socket.IO.
- `registerSocketHandlers.ts` owns connection identity, authorization, room membership, event validation, and routing.
- `sessionManager.ts` owns in-memory session metadata and message history.
- `humeService.ts` owns one Hume EVI socket per active student session.

## Session lifecycle

1. A student emits `create_session` with a participant ID and persona.
2. The server creates an in-memory session, joins the student's socket to its room, and emits `session_created`.
3. The server starts Hume EVI when the persona has a `config_id`.
4. Faculty emits `join_session`; the server validates the session, joins the room, and returns `joined_session` plus `message_history`.
5. Audio, transcript messages, AI messages, and chat messages are routed to the room.
6. When the student ends or disconnects, the server closes EVI and emits `session_ended`. Faculty keeps its local review state.
7. Faculty may export the session and then emit `leave_session` by disconnecting from the dashboard view.

## Socket event contract

### Client to server

| Event | Payload | Purpose |
| --- | --- | --- |
| `create_session` | `{ studentId, personaData }` | Create a student-owned session. |
| `join_session` | `{ sessionId, facultyId }` | Join an active session as faculty. |
| `leave_session` | none | Leave the current session as faculty. |
| `VOICE_INPUT` | `{ sessionId, encodedAudioData }` | Stream a base64 microphone chunk. |
| `send_message` | `{ sessionId, type, content }` | Send student/faculty text chat. |
| `end_session` | `{ sessionId }` | End a student-owned session. |

### Server to client

| Event | Purpose |
| --- | --- |
| `session_created` | Returns a newly created session. |
| `joined_session` | Confirms a faculty join. |
| `message_history` | Sends existing transcript and chat messages. |
| `new_message` | Broadcasts a persisted message. |
| `session_ended` | Signals that the student session is over. |
| `transcriptionUpdate` | Sends interim or final student speech text. |
| `assistantMessage` | Sends AI response text. |
| `audioOutput` | Sends synthesized audio bytes. |
| `humeError`, `humeClose`, `error` | Reports service or protocol errors. |

## Data and trust boundaries

- Personas are synthetic static assets and are sent from the browser to the server at session creation.
- Session and message state is memory-only and disappears when the server restarts.
- The server, not the client, assigns message timestamps, sender IDs, and permitted chat roles.
- Hume credentials exist only in `server/.env`; environment files are ignored by Git.
- The prototype has no authentication or authorization beyond connection-scoped role and session ownership.

## Known limitations

- One server process and in-memory state only; no horizontal scaling or durable recovery.
- No user accounts, access control, rate limiting, or audit log.
- No automated educational scoring or formal validation study.
- Voice behavior depends on a legacy third-party SDK and external EVI configuration.
- The faculty export is a local JSON download, not a protected student-record system.
