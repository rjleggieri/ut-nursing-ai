import { useState, useEffect } from 'react';
import { Check, ChevronDown } from "lucide-react";
import yaml from 'js-yaml';
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
import { useToast } from "@/hooks/use-toast";
import { PersonaData } from "@/types/persona";

interface PersonaSelectorProps {
  onPersonaSelected: (persona: PersonaData | null) => void;
  disabled?: boolean;
}

const PersonaSelector = ({ onPersonaSelected, disabled }: PersonaSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const [personas, setPersonas] = useState<PersonaData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  const loadPersonas = async () => {
    setIsLoading(true);
    console.log("Loading personas...");
    try {
      const timestamp = new Date().getTime();
      let personaFiles = ['advanced_directive', 'chronic_diagnosis', 'cultural_prenatal', 'adolescent_risk'];
      
      try {
        const response = await fetch(`./api/personas?t=${timestamp}`);
        if (response.ok) {
            const fileList = await response.json();
            if (Array.isArray(fileList) && fileList.length > 0) {
              personaFiles = fileList;
              console.log("Fetched persona list from API:", personaFiles);
            }
        } else {
            console.log("API for persona list not found or failed, using defaults.");
        }
      } catch (error) {
        console.log("Error fetching persona list, using defaults:", error);
      }
      
      const loadedPersonasPromises = personaFiles.map(async (id) => {
        try {
          const response = await fetch(`./personas/${id}.yaml?t=${timestamp}`);
          if (!response.ok) {
            throw new Error(`Failed to fetch persona ${id}: ${response.statusText}`);
          }
          const yamlText = await response.text();
          const parsedData = yaml.load(yamlText) as any;
          
          if (!parsedData || typeof parsedData !== 'object' || !parsedData.scenario) {
              throw new Error(`Invalid YAML structure for ${id}`);
          }

          parsedData.id = id; 
          
          console.log(`Loaded and parsed ${id}.yaml`);
          return parsedData as PersonaData;
        } catch (error) {
          console.error(`Failed to load or parse persona ${id}:`, error);
          toast({ variant: "destructive", title: `Error loading ${id}`, description: String(error) });
          return null;
        }
      });
      
      const loadedPersonasResults = await Promise.all(loadedPersonasPromises);
      const validPersonas = loadedPersonasResults.filter(p => p !== null) as PersonaData[];
      
      setPersonas(validPersonas);
      console.log(`Successfully loaded ${validPersonas.length} personas.`);
      toast({
        title: "Personas Loaded",
        description: `Loaded ${validPersonas.length} patient profiles.`,
        duration: 2000,
      });

    } catch (error) {
      console.error("General error loading personas:", error);
      toast({
        variant: "destructive",
        title: "Error Loading Profiles",
        description: "Could not load patient profiles. Please try refreshing.",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    loadPersonas();
  }, []);

  const selectedPersonaObject = personas.find(persona => persona.id === selectedValue);

  const handleSelect = (selectedId: string) => {
    const persona = personas.find(p => p.id === selectedId);
    setSelectedValue(selectedId);
    setOpen(false);
    onPersonaSelected(persona || null);
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Select Patient Profile</h2>
      </div>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-11"
            disabled={isLoading || disabled}
          >
            {selectedValue
              ? personas.find((p) => p.id === selectedValue)?.scenario || "Select profile..."
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
                    onSelect={() => handleSelect(persona.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedValue === persona.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {persona.scenario || persona.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {selectedPersonaObject && (
         <div className="p-4 bg-utexas-lightgray rounded-md border border-gray-200">
             <h3 className="font-medium text-utexas-navy">{selectedPersonaObject.name}, {selectedPersonaObject.age}</h3>
             <p className="text-sm text-gray-500 mt-1">{selectedPersonaObject.scenario}</p>
             
             <p className="text-sm font-medium mt-2">Diagnosis:</p>
             <p className="text-sm">{selectedPersonaObject.diagnosis}</p>
             
             {selectedPersonaObject.scenario_goal && (
               <>
                 <p className="text-sm font-medium mt-2">Scenario Goal:</p>
                 <p className="text-sm">{selectedPersonaObject.scenario_goal}</p>
               </>
             )}
             
             {selectedPersonaObject.background?.clinical && (
               <>
                 <p className="text-sm font-medium mt-2">Clinical Background:</p>
                 <p className="text-sm">{selectedPersonaObject.background.clinical}</p>
               </>
             )}
         </div>
      )}
    </div>
  );
};

export default PersonaSelector;
