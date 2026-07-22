import { useCallback, useEffect, useRef } from "react";

export function useAudioPlayback() {
  const queue = useRef<Blob[]>([]);
  const currentAudio = useRef<HTMLAudioElement | null>(null);
  const currentUrl = useRef<string | null>(null);
  const isPlaying = useRef(false);

  const stop = useCallback(() => {
    currentAudio.current?.pause();
    currentAudio.current = null;
    if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
    currentUrl.current = null;
    queue.current = [];
    isPlaying.current = false;
  }, []);

  const playNext = useCallback(() => {
    const blob = queue.current.shift();
    if (!blob) {
      isPlaying.current = false;
      return;
    }

    isPlaying.current = true;
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentUrl.current = url;
    currentAudio.current = audio;

    const finish = () => {
      URL.revokeObjectURL(url);
      if (currentUrl.current === url) currentUrl.current = null;
      if (currentAudio.current === audio) currentAudio.current = null;
      playNext();
    };

    audio.onended = finish;
    audio.onerror = finish;
    audio.play().catch(finish);
  }, []);

  const enqueue = useCallback(
    (audioBuffer: ArrayBuffer) => {
      queue.current.push(new Blob([audioBuffer], { type: "audio/wav" }));
      if (!isPlaying.current) playNext();
    },
    [playNext],
  );

  useEffect(() => stop, [stop]);

  return { enqueue, stop };
}
