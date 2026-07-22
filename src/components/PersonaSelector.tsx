import { useEffect, useState } from 'react';
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
import { toast } from "@/lib/toast";
import { PersonaData } from "@/types/persona";
import { loadPersonas } from "@/services/personaService";

interface PersonaSelectorProps {
  onPersonaSelected: (persona: PersonaData | null) => void;
  disabled?: boolean;
}

const PersonaSelector = ({ onPersonaSelected, disabled }: PersonaSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const [personas, setPersonas] = useState<PersonaData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    let cancelled = false;

    loadPersonas()
      .then((loadedPersonas) => {
        if (!cancelled) setPersonas(loadedPersonas);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          toast.error("Error loading profiles", {
            description: error instanceof Error ? error.message : "Please refresh and try again.",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
      
    </div>
  );
};

export default PersonaSelector;
