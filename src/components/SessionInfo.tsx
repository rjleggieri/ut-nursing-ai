
import { useState, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';

// Generate a random alphanumeric session ID
const generateSessionId = () => {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
};

const SessionInfo = () => {
  const [sessionId, setSessionId] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSessionId(generateSessionId());
  }, []);

  const handleCopyClick = () => {
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
        <div className="bg-white px-4 py-2 rounded border font-mono text-sm flex-1">
          {sessionId}
        </div>
        <Button 
          size="sm" 
          variant="outline" 
          className="flex items-center gap-1" 
          onClick={handleCopyClick}
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
      <p className="text-xs text-muted-foreground mt-1">
        Share this ID with faculty to connect to your session
      </p>
    </div>
  );
};

export default SessionInfo;
