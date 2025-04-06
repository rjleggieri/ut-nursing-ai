
import { useState } from 'react';
import { Search, Clipboard, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/Header';
import { ScrollArea } from '@/components/ui/scroll-area';

const FacultyDashboard = () => {
  const [sessionId, setSessionId] = useState('');
  const [connected, setConnected] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  // Handle connect button
  const handleConnect = () => {
    if (!sessionId.trim()) {
      toast.error("Please enter a valid Session ID");
      return;
    }
    
    // In a real implementation, this would attempt to connect to the student's session
    // For now, we'll simulate a successful connection
    setConnected(true);
    toast.success("Connected to student session", {
      description: `Session ID: ${sessionId}`
    });
  };

  // Handle sending feedback
  const handleSendFeedback = () => {
    if (!feedbackText.trim()) return;
    
    // In a real implementation, this would send feedback to the student
    toast.success("Feedback sent to student");
    setFeedbackText('');
  };

  // Handle paste from clipboard
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setSessionId(text);
      toast.info("Session ID pasted from clipboard");
    } catch (error) {
      toast.error("Could not access clipboard");
    }
  };

  return (
    <div className="min-h-screen bg-utexas-gray flex flex-col">
      <Header />
      
      <main className="container flex-1 pb-8">
        <h1 className="text-2xl font-bold mb-6 text-utexas-navy">Faculty Dashboard</h1>
        
        {!connected ? (
          <div className="max-w-md mx-auto bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium mb-4">Connect to Student Session</h2>
            
            <div className="flex items-center space-x-2 mb-6">
              <div className="flex-1">
                <Input
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  placeholder="Enter Session ID"
                />
              </div>
              <Button
                size="icon"
                variant="outline"
                onClick={handlePasteFromClipboard}
                title="Paste from clipboard"
              >
                <Clipboard className="h-4 w-4" />
              </Button>
            </div>
            
            <Button 
              className="w-full" 
              onClick={handleConnect} 
              disabled={!sessionId.trim()}
            >
              <Search className="mr-2 h-4 w-4" />
              Connect to Session
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-white p-4 rounded-lg shadow">
                <h2 className="font-semibold text-lg mb-2">Student Session: {sessionId}</h2>
                <div className="flex items-center text-sm text-emerald-600 mb-4">
                  <div className="h-2 w-2 rounded-full bg-emerald-600 mr-2"></div>
                  Connected
                </div>
                
                <Tabs defaultValue="conversation" className="w-full">
                  <TabsList className="grid grid-cols-2">
                    <TabsTrigger value="conversation">Live Conversation</TabsTrigger>
                    <TabsTrigger value="metrics">Metrics & Analysis</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="conversation" className="mt-4">
                    <ScrollArea className="h-[60vh] border rounded-md">
                      <div className="p-4">
                        <div className="flex mb-5">
                          <div className="bg-gray-100 py-2 px-3 rounded-lg max-w-[80%]">
                            <div className="text-xs font-medium mb-1">Patient</div>
                            <p>Hello, how are you today? I'm a little nervous about being here.</p>
                          </div>
                        </div>
                        
                        <div className="flex justify-end mb-5">
                          <div className="bg-utexas-orange text-white py-2 px-3 rounded-lg max-w-[80%]">
                            <div className="text-xs font-medium mb-1">Student</div>
                            <p>Good morning. It's normal to feel nervous. Thank you for coming in today. I'd like to talk about how you've been feeling lately.</p>
                          </div>
                        </div>
                      </div>
                    </ScrollArea>
                  </TabsContent>
                  
                  <TabsContent value="metrics" className="mt-4">
                    <div className="p-6 text-center border rounded-md h-[60vh] flex items-center justify-center">
                      <div className="text-muted-foreground">
                        Communication metrics and analysis will appear here as the conversation progresses.
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
            
            <div className="lg:col-span-4">
              <div className="bg-white p-4 rounded-lg shadow h-full flex flex-col">
                <h2 className="font-semibold text-lg mb-4">Provide Feedback</h2>
                
                <ScrollArea className="flex-1 mb-4 max-h-[40vh]">
                  <div className="space-y-3">
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <p className="text-sm">Remember to use open-ended questions.</p>
                      <p className="text-xs text-right mt-1 text-gray-500">10:23 AM</p>
                    </div>
                  </div>
                </ScrollArea>
                
                <div className="mt-auto">
                  <div className="flex gap-2">
                    <Input
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Type feedback for student..."
                      className="flex-1"
                    />
                    <Button onClick={handleSendFeedback} disabled={!feedbackText.trim()}>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <Button variant="outline" size="sm" className="text-xs">
                      Good empathy
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs">
                      Open questions
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs">
                      Try rephrasing
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs">
                      Check understanding
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default FacultyDashboard;
