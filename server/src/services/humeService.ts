import { HumeClient, Hume } from 'hume'; // Import from the correct SDK
import dotenv from 'dotenv';
// Import WebSocket types for event handlers (specifically CloseEvent)
import { CloseEvent } from 'ws'; 

dotenv.config();

const HUME_API_KEY = process.env.HUME_API_KEY || "";
const HUME_SECRET_KEY = process.env.HUME_SECRET_KEY || "";
console.log(`HUME_API_KEY loaded: ${HUME_API_KEY ? HUME_API_KEY.substring(0, 4) + '...' + HUME_API_KEY.slice(-4) : 'MISSING'}`);
console.log(`HUME_SECRET_KEY loaded: ${HUME_SECRET_KEY ? '******' + HUME_SECRET_KEY.slice(-4) : 'MISSING'}`);

// Instantiate Hume Client
// Handle potential errors if keys are missing
let humeClient: HumeClient;
try {
    humeClient = new HumeClient({ 
        apiKey: HUME_API_KEY, 
        secretKey: HUME_SECRET_KEY 
    });
    console.log("HumeClient instantiated.");
} catch (error) {
    console.error("FATAL: Failed to instantiate HumeClient. Check API/Secret Keys.", error);
    // Potentially exit or prevent server start if Hume is critical
    process.exit(1); 
}

// Type inference for the socket object returned by connect()
// We'll call it EviSocket for clarity, but it's derived from the SDK
type EviSocket = Awaited<ReturnType<typeof humeClient.empathicVoice.chat.connect>>;

// Map to store active EVI connections per session
const activeSockets = new Map<string, EviSocket>(); 
console.log("[humeService] Initialized activeSockets map.");

// Define callback types for clarity
type TranscriptionCallback = (result: { text: string; isFinal: boolean }) => void;
type ErrorCallback = (error: Error) => void;
// Update CloseCallback to match standard WebSocket CloseEvent signature
type CloseCallback = (event: CloseEvent) => void;
// Add callbacks for other events if needed (e.g., assistant response, TTS audio)
type AssistantMessageCallback = (message: Hume.empathicVoice.AssistantMessage) => void;
type AudioOutputCallback = (audio: Buffer) => void; // Assuming SDK converts Base64 back to Buffer or provides it directly

/**
 * Starts a streaming EVI connection with Hume AI for a given session using a specific Config ID.
 */
export const startSttStream = async (
  sessionId: string,
  configId: string, // *** Use configId ***
  onTranscription: TranscriptionCallback,
  onAssistantMessage: AssistantMessageCallback, 
  onAudioOutput: AudioOutputCallback,       
  onError: ErrorCallback,                   
  onClose: CloseCallback
) => {
  console.log(`[humeService] startSttStream called for sessionId: ${sessionId} using configId: ${configId}. Map size: ${activeSockets.size}`);
  if (activeSockets.has(sessionId)) {
    console.warn(`[humeService] EVI socket already active for session ${sessionId}, reusing.`);
    return activeSockets.get(sessionId); 
  }

  try {
    // *** Build connectPayload using ONLY configId ***
    const connectPayload = { configId };

    // *** Log the payload before connecting ***
    console.log('[humeService] Attempting to connect with payload:', JSON.stringify(connectPayload));
    
    // *** Connect using the payload ***
    const socket = await humeClient.empathicVoice.chat.connect(connectPayload);
    console.log(`[humeService] NEW Hume EVI socket connected for session ${sessionId}.`);

    activeSockets.set(sessionId, socket);
    console.log(`[humeService] Socket added to map for ${sessionId}. New map size: ${activeSockets.size}`);

    // --- WebSocket Event Handlers --- 
    socket.on('open', () => {
      console.log(`[humeService] Hume EVI socket OPEN (native event) for session ${sessionId}.`);
    });

    socket.on('message', (message: Hume.empathicVoice.SubscribeEvent) => {
        // REMOVE Log the raw message object
        // if (message.type === 'user_message') {
        //     console.log('[humeService] Received raw user_message event:', JSON.stringify(message, null, 2));
        // }
        // Add specific log for audio_output size?
        if (message.type === 'audio_output') {
            // console.log(`[humeService] Received audio_output chunk for ${sessionId}, base64 size: ${message.data.length}`);
        }
        // Callbacks handle other logic (onTranscription, etc.)
        switch (message.type) {
            case 'user_message':
                const userMessage = message.message;
                if (userMessage.role === 'user' && typeof userMessage.content === 'string') {
                    // *** FIX: Determine isFinal based on !message.interim ***
                    const isFinal = message.interim === false;
                    onTranscription({ text: userMessage.content, isFinal: isFinal });
                } else {
                    console.warn("[humeService] Received user_message without string content or wrong role:", message.type);
                }
                break;
            case 'assistant_message':
                onAssistantMessage(message); 
                break;
            case 'audio_output':
                try {
                    const audioBuffer = Buffer.from(message.data, 'base64');
                    onAudioOutput(audioBuffer);
                } catch(bufferError) {
                    console.error("[humeService] Error decoding Base64 audio output:", bufferError);
                }
                break;
            case 'error':
                console.error(`[humeService] Hume EVI error message for session ${sessionId}:`, message.message, message.code);
                onError(new Error(`${message.message} (Code: ${message.code})`));
                // Consider if closeSttStream should be called here, might cause loop if error persists
                // closeSttStream(sessionId);
                break;
            // Ignore other types for cleaner logs unless debugging
            // default:
                // console.log(`[humeService] Received unhandled message type: ${message.type}`);
                // break;
        }
    });

    socket.on('error', (error) => {
      console.error(`[humeService] Hume EVI WebSocket connection error (native event) for session ${sessionId}:`, error);
      // No need to delete from map here, 'close' event should handle it
      onError(error instanceof Error ? error : new Error(String(error)));
    });

    socket.on('close', (event: CloseEvent) => {
      console.log(`[humeService] Hume EVI WebSocket closed (native event) for session ${sessionId}. Code: ${event.code}, Reason: ${event.reason?.toString()}`);
      // Ensure deletion from map on close
      if (activeSockets.delete(sessionId)) {
          console.log(`[humeService] Socket removed from map for ${sessionId}. New map size: ${activeSockets.size}`);
      } else {
          console.warn(`[humeService] Attempted to remove socket for ${sessionId} on close, but it was not found in map.`);
      }
      onClose(event); 
    });

    return socket;

  } catch (error) {
    console.error(`[humeService] FAILED to connect NEW Hume EVI socket for session ${sessionId}:`, error);
    // Ensure cleanup if connection fails
    activeSockets.delete(sessionId); 
    throw error; 
  }
};

/**
 * Sends an audio chunk to the active EVI stream for a given session.
 * @param sessionId The session ID.
 * @param encodedAudioData The Base64 encoded audio data string.
 */
// *** Expect encodedAudioData string ***
export const sendAudioToStt = (sessionId: string, encodedAudioData: string) => {
  const socket = activeSockets.get(sessionId);
  if (socket) {
    try {
      // *** REMOVE Buffer conversion ***
      if (!encodedAudioData || typeof encodedAudioData !== 'string') {
           console.error(`[humeService] Invalid encodedAudioData provided for session ${sessionId}. Type: ${typeof encodedAudioData}`);
           return;
      }

      const audioInput: Omit<Hume.empathicVoice.AudioInput, 'type'> = {
        // *** Send string directly ***
        data: encodedAudioData, 
      };
      // console.log(`[humeService] Sending audio input (${encodedAudioData.length} base64 chars) for session ${sessionId}`);
      socket.sendAudioInput(audioInput);
    } catch (sendError) {
      console.error(`[humeService] Error sending audio input for session ${sessionId}:`, sendError);
    }
  } else {
     // console.warn(`[humeService] No active EVI socket found for session ${sessionId}. Cannot send audio.`);
  }
};

/**
 * Closes the active EVI WebSocket stream for a given session.
 * @param sessionId The session ID.
 */
export const closeSttStream = (sessionId: string) => {
  console.log(`[humeService] closeSttStream called for sessionId: ${sessionId}. Map size: ${activeSockets.size}`);
  const socket = activeSockets.get(sessionId);
  if (socket) {
    console.log(`[humeService] Found active socket for ${sessionId}, calling socket.close().`);
    socket.close(); // This should trigger the 'close' event handler which removes from map
  } else {
    console.warn(`[humeService] closeSttStream: No active socket found in map for session ${sessionId} to close.`);
  }
}; 