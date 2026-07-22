import yaml from "js-yaml";

import type { PersonaData } from "@/types/persona";

const PERSONA_IDS = [
  "advanced_directive",
  "adolescent_risk",
  "chronic_diagnosis",
  "cultural_prenatal",
] as const;

function isPersonaData(value: unknown): value is Omit<PersonaData, "id"> {
  if (!value || typeof value !== "object") return false;

  const persona = value as Record<string, unknown>;
  return (
    typeof persona.scenario === "string" &&
    typeof persona.name === "string" &&
    typeof persona.age === "number" &&
    typeof persona.system_prompt === "string"
  );
}

async function loadPersona(id: (typeof PERSONA_IDS)[number]): Promise<PersonaData> {
  const response = await fetch(`${import.meta.env.BASE_URL}personas/${id}.yaml`);
  if (!response.ok) {
    throw new Error(`Unable to load persona "${id}" (${response.status}).`);
  }

  const parsed = yaml.load(await response.text());
  if (!isPersonaData(parsed)) {
    throw new Error(`Persona "${id}" does not match the expected schema.`);
  }

  return { ...parsed, id } as PersonaData;
}

export async function loadPersonas(): Promise<PersonaData[]> {
  return Promise.all(PERSONA_IDS.map(loadPersona));
}
