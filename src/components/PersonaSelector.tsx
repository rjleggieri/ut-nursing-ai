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
    console.log("Loading personas dynamically...");
    try {
      const timestamp = new Date().getTime();
      
      // *** Use import.meta.glob to find YAML files ***
      const modules = import.meta.glob('/public/personas/*.yaml');
      console.log("Found persona modules:", Object.keys(modules));

      // *** Iterate through the found modules ***
      const loadedPersonasPromises = Object.keys(modules).map(async (path) => {
        // Extract ID (filename without extension) from path
        const filename = path.split('/').pop();
        if (!filename) return null; 
        const id = filename.replace('.yaml', '');
        
        try {
          // Construct the fetch path relative to the public directory
          const fetchPath = `./personas/${filename}?t=${timestamp}`;
          const response = await fetch(fetchPath);
          if (!response.ok) {
            throw new Error(`Failed to fetch ${fetchPath}: ${response.statusText}`);
          }
          const yamlText = await response.text();
          const parsedData = yaml.load(yamlText) as any;
          
          if (!parsedData || typeof parsedData !== 'object' || !parsedData.scenario) {
              throw new Error(`Invalid YAML structure for ${id}`);
          }

          parsedData.id = id; 
          
          console.log(`Loaded and parsed ${id}.yaml from ${path}`);
          return parsedData as PersonaData;
        } catch (error) {
          console.error(`Failed to load or parse persona ${id} from ${path}:`, error);
          toast({ variant: "destructive", title: `Error loading ${id}`, description: String(error) });
          return null;
        }
      });
      
      const loadedPersonasResults = await Promise.all(loadedPersonasPromises);
      const validPersonas = loadedPersonasResults.filter(p => p !== null) as PersonaData[];
      
      setPersonas(validPersonas);
      console.log(`Successfully loaded ${validPersonas.length} personas dynamically.`);
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
      
      {/* REMOVE the block displaying selectedPersonaObject details */}
      {/* {selectedPersonaObject && ( ... ) } */}

    </div>
  );
};

export default PersonaSelector;
