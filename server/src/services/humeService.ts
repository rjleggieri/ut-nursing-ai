import { Hume, HumeClient } from "hume";
import type { CloseEvent } from "ws";

type EviSocket = Awaited<
  ReturnType<HumeClient["empathicVoice"]["chat"]["connect"]>
>;

export interface EviCallbacks {
  onTranscription: (result: { text: string; isFinal: boolean }) => void;
  onAssistantMessage: (message: Hume.empathicVoice.AssistantMessage) => void;
  onAudioOutput: (audio: Buffer) => void;
  onError: (error: Error) => void;
  onClose: (event: CloseEvent) => void;
}

const activeSockets = new Map<string, EviSocket>();

function getHumeClient(): HumeClient {
  const apiKey = process.env.HUME_API_KEY;
  const secretKey = process.env.HUME_SECRET_KEY;

  if (!apiKey || !secretKey) {
    throw new Error("HUME_API_KEY and HUME_SECRET_KEY must be configured.");
  }

  return new HumeClient({ apiKey, secretKey });
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

export async function startEviSession(
  sessionId: string,
  configId: string,
  callbacks: EviCallbacks,
): Promise<void> {
  if (activeSockets.has(sessionId)) return;

  const socket = await getHumeClient().empathicVoice.chat.connect({ configId });
  activeSockets.set(sessionId, socket);

  socket.on("message", (message: Hume.empathicVoice.SubscribeEvent) => {
    switch (message.type) {
      case "user_message": {
        const { content, role } = message.message;
        if (role === "user" && typeof content === "string") {
          callbacks.onTranscription({ text: content, isFinal: message.interim === false });
        }
        break;
      }
      case "assistant_message":
        callbacks.onAssistantMessage(message);
        break;
      case "audio_output":
        callbacks.onAudioOutput(Buffer.from(message.data, "base64"));
        break;
      case "error":
        callbacks.onError(new Error(`${message.message} (code ${message.code})`));
        break;
    }
  });

  socket.on("error", (error) => callbacks.onError(asError(error)));
  socket.on("close", (event: CloseEvent) => {
    activeSockets.delete(sessionId);
    callbacks.onClose(event);
  });
}

export function sendAudio(sessionId: string, encodedAudioData: string): boolean {
  const socket = activeSockets.get(sessionId);
  if (!socket || !encodedAudioData) return false;

  socket.sendAudioInput({ data: encodedAudioData });
  return true;
}

export function closeEviSession(sessionId: string): void {
  activeSockets.get(sessionId)?.close();
}
