
import React from "react";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * Configuration button that links to the faculty dashboard
 */
const ConfigButton = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-2">
      <Button 
        variant="outline" 
        className="w-full flex items-center justify-center gap-2"
        onClick={() => navigate('/faculty-dashboard')}
      >
        <Settings className="h-4 w-4" />
        <span>Faculty Dashboard</span>
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        Access settings and observation tools
      </p>
    </div>
  );
};

export default ConfigButton;
