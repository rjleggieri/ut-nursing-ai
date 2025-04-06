
import { useState, useEffect } from 'react';
import { Check, ChevronDown, RefreshCw } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";

interface PersonaSelectorProps {
  onPersonaSelected: (persona: Partial<Persona>) => void;
}

const PersonaSelector = ({ onPersonaSelected }: PersonaSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [personas, setPersonas] = useState<Partial<Persona>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  const loadPersonas = async () => {
    setIsLoading(true);
    try {
      // Adding a cache-busting parameter to prevent browser caching
      const timestamp = new Date().getTime();
      
      // First, fetch the list of available YAML files from the server
      const response = await fetch(`/api/personas?t=${timestamp}`);
      
      // Fallback to hardcoded list if API endpoint isn't available
      let personaFiles = [
        'advanced_directive',
        'chronic_diagnosis',
        'cultural_prenatal',
        'adolescent_risk'
      ];
      
      // If the API responded successfully, use that list instead
      try {
        const fileList = await response.json();
        if (Array.isArray(fileList) && fileList.length > 0) {
          personaFiles = fileList;
        }
      } catch (error) {
        console.log("Using default persona list");
      }
      
      const loadedPersonas = await Promise.all(
        personaFiles.map(async (id) => {
          try {
            // Add cache-busting parameter to each request
            const response = await fetch(`/personas/${id}.yaml?t=${timestamp}`);
            const yamlText = await response.text();
            
            // Parse the YAML content
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
      toast({
        title: "Personas Updated",
        description: `Loaded ${filteredPersonas.length} patient profiles`,
        duration: 2000,
      });
    } catch (error) {
      console.error("Failed to load personas:", error);
      toast({
        variant: "destructive",
        title: "Error Loading Profiles",
        description: "Could not load patient profiles. Please try refreshing.",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load persona data from YAML files
  useEffect(() => {
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
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Select Patient Profile</h2>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => loadPersonas()}
          disabled={isLoading}
          className="h-8 w-8 p-0"
          title="Refresh profiles"
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          <span className="sr-only">Refresh profiles</span>
        </Button>
      </div>
      
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
