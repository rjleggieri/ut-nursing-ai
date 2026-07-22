export function getParticipantId(role: "student" | "faculty"): string {
  const storageKey = `carespeak.${role}Id`;
  const existing = sessionStorage.getItem(storageKey);
  if (existing) return existing;

  const id = `${role}-${crypto.randomUUID()}`;
  sessionStorage.setItem(storageKey, id);
  return id;
}
