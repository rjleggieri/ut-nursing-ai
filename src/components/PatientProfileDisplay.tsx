import { PersonaData } from '@/types/persona';

interface PatientProfileDisplayProps {
  persona: PersonaData | null;
}

const PatientProfileDisplay = ({ persona }: PatientProfileDisplayProps) => {
  if (!persona) {
    return (
      <div className="flex items-center justify-center h-full p-6 bg-white rounded-md border border-gray-200 text-muted-foreground">
        Select a patient profile to view details.
      </div>
    );
  }

  return (
    // Use grid for layout, ensure overall component takes full height
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-white rounded-md border border-gray-200 h-full overflow-hidden">
      {/* Left Column: Image */}
      <div className="md:col-span-1">
        <img 
          src={`/personas/${persona.id}.png`} 
          alt={`${persona.name} profile picture`}
          className="w-full h-auto border-2 border-gray-300 rounded-md" 
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
      </div>

      {/* Right Column: Details - Make this scrollable */}
      <div className="md:col-span-2 space-y-4 overflow-y-auto pr-2"> 
        <h2 className="text-2xl font-semibold text-utexas-navy border-b pb-2">{persona.name}, {persona.age}</h2>
        
        <div className="space-y-3 text-base">
          <div> 
            <p className="font-medium text-gray-700">Scenario:</p>
            <p className="text-gray-600">{persona.scenario}</p>
          </div>
          <div> 
            <p className="font-medium text-gray-700">Diagnosis:</p>
            <p className="text-gray-600">{persona.diagnosis}</p>
          </div>
          
          {persona.scenario_goal && (
            <div>
              <p className="font-medium text-gray-700">Scenario Goal:</p>
              <p className="text-gray-600">{persona.scenario_goal}</p>
            </div>
          )}
          
          {persona.background?.clinical && (
            <div>
              <p className="font-medium text-gray-700">Clinical Background:</p>
              <p className="text-gray-600 whitespace-pre-wrap">{persona.background.clinical}</p>
            </div>
          )}

          {persona.background?.emotional && (
            <div>
              <p className="font-medium text-gray-700">Emotional Background:</p>
              <p className="text-gray-600 whitespace-pre-wrap">{persona.background.emotional}</p>
            </div>
          )}

          {/* {persona.background?.social && (
            <div>
              <p className="font-medium text-gray-700">Social Background:</p>
              <p className="text-gray-600 whitespace-pre-wrap">{persona.background.social}</p>
            </div>
          )} */}
          
          {/* Optionally add other fields like Milestones, Engagement, Conclusion later */}
        </div>
      </div>
    </div>
  );
};

export default PatientProfileDisplay; 