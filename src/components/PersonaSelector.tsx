
import { useState, useEffect } from 'react';
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Persona } from "@/types/persona";

// Mock personas until we have actual YAML loading
const mockPersonas: Partial<Persona>[] = [
  {
    id: "advanced_directive",
    name: "Linda Harris",
    age: 72,
    scenario: "Advanced Directives and End-of-Life Care",
    diagnosis: "Stage IV lung cancer, prognosis 3–6 months",
  },
  {
    id: "diabetes_management",
    name: "Robert Johnson",
    age: 55,
    scenario: "Diabetes Management",
    diagnosis: "Type 2 Diabetes, newly diagnosed",
  },
  {
    id: "mental_health",
    name: "Sarah Williams",
    age: 32,
    scenario: "Mental Health Assessment",
    diagnosis: "Symptoms of anxiety and depression",
  }
];

interface PersonaSelectorProps {
  onPersonaSelected: (persona: Partial<Persona>) => void;
}

const PersonaSelector = ({ onPersonaSelected }: PersonaSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [personas, setPersonas] = useState<Partial<Persona>[]>(mockPersonas);
  
  // In a real implementation, this would load persona data from YAML files
  useEffect(() => {
    // This would be where you'd fetch the list of personas from your YAML files
    // For now, we're using the mock data
  }, []);

  // Find the selected persona
  const selectedPersona = personas.find(persona => persona.id === value);

  // Handle selection
  const handleSelect = (currentValue: string) => {
    setValue(currentValue);
    setOpen(false);
    const persona = personas.find(p => p.id === currentValue);
    if (persona) {
      onPersonaSelected(persona);
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <h2 className="text-lg font-medium">Select Patient Persona</h2>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-11"
          >
            {value
              ? personas.find((persona) => persona.id === value)?.name || "Select persona..."
              : "Select persona..."}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Search personas..." />
            <CommandEmpty>No persona found.</CommandEmpty>
            <CommandGroup>
              {personas.map((persona) => (
                <CommandItem
                  key={persona.id}
                  value={persona.id}
                  onSelect={handleSelect}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === persona.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {persona.name} - {persona.scenario}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedPersona && (
        <div className="p-4 bg-utexas-lightgray rounded-md border border-gray-200">
          <h3 className="font-medium text-utexas-navy">{selectedPersona.name}, {selectedPersona.age}</h3>
          <p className="text-sm text-gray-500 mt-1">{selectedPersona.scenario}</p>
          <p className="text-sm font-medium mt-2">Diagnosis:</p>
          <p className="text-sm">{selectedPersona.diagnosis}</p>
        </div>
      )}
    </div>
  );
};

export default PersonaSelector;
