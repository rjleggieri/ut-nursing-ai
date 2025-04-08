import { useState, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';

interface SessionInfoProps {
  sessionId: string;
}

const SessionInfo = ({ sessionId }: SessionInfoProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopyClick = () => {
    if (!sessionId) return;
    navigator.clipboard.writeText(sessionId);
    setCopied(true);
    toast("Session ID copied to clipboard!", {
      description: "Share this with faculty to connect to your session."
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-utexas-lightgray rounded-md p-4 border border-gray-200">
      <h3 className="text-sm font-medium mb-2">Session ID</h3>
      <div className="flex items-center gap-2">
        <div className="bg-white px-4 py-2 rounded border font-mono text-sm flex-1 min-h-[36px] flex items-center">
          {sessionId ? sessionId : <span className="text-gray-400 italic">Not active</span>}
        </div>
        <Button 
          size="sm" 
          variant="outline" 
          className="flex items-center gap-1" 
          onClick={handleCopyClick}
          disabled={!sessionId}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              <span className="hidden sm:inline">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              <span className="hidden sm:inline">Copy</span>
            </>
          )}
        </Button>
      </div>
      {sessionId && (
        <p className="text-xs text-muted-foreground mt-1">
          Share this ID with faculty to connect to your session
        </p>
      )}
    </div>
  );
};

export default SessionInfo;
