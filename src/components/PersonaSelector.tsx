
import { useState, useEffect } from 'react';
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Persona } from "@/types/persona";

interface PersonaSelectorProps {
  onPersonaSelected: (persona: Partial<Persona>) => void;
}

const PersonaSelector = ({ onPersonaSelected }: PersonaSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [personas, setPersonas] = useState<Partial<Persona>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load persona data from YAML files
  useEffect(() => {
    const loadPersonas = async () => {
      setIsLoading(true);
      try {
        // These are the persona files we know exist based on the allowed files
        const personaFiles = [
          'advanced_directive',
          'chronic_diagnosis',
          'cultural_prenatal',
          'adolescent_risk'
        ];
        
        const loadedPersonas = await Promise.all(
          personaFiles.map(async (id) => {
            try {
              const response = await fetch(`/personas/${id}.yaml`);
              const yamlText = await response.text();
              
              // Parse the YAML content (in a real implementation, you'd use a YAML parser)
              // For now, we'll extract basic info using regex
              const nameMatch = yamlText.match(/name:\s*(.*)/);
              const ageMatch = yamlText.match(/age:\s*(\d+)/);
              const scenarioMatch = yamlText.match(/scenario:\s*(.*)/);
              const diagnosisMatch = yamlText.match(/diagnosis:\s*(.*)/);
              
              return {
                id,
                name: nameMatch ? nameMatch[1].trim() : '',
                age: ageMatch ? parseInt(ageMatch[1]) : 0,
                scenario: scenarioMatch ? scenarioMatch[1].trim() : '',
                diagnosis: diagnosisMatch ? diagnosisMatch[1].trim() : ''
              };
            } catch (error) {
              console.error(`Failed to load persona ${id}:`, error);
              return null;
            }
          })
        );
        
        // Filter out any failed loads
        const filteredPersonas = loadedPersonas.filter(persona => persona !== null) as Partial<Persona>[];
        setPersonas(filteredPersonas);
      } catch (error) {
        console.error("Failed to load personas:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPersonas();
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
      <h2 className="text-lg font-medium">Select Patient Profile</h2>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-11"
            disabled={isLoading}
          >
            {value
              ? personas.find((persona) => persona.id === value)?.scenario || "Select profile..."
              : "Select profile..."}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Search profiles..." />
            <CommandList>
              <CommandEmpty>No profile found.</CommandEmpty>
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
                    {persona.scenario}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
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
