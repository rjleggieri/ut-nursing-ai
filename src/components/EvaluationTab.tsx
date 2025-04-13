import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';

// Define evaluation criteria here
const evaluationCriteria = [
  {
    title: "Communication Skills",
    description: "Evaluate clarity, appropriateness of terminology, and adaptability based on patient understanding.",
  },
  {
    title: "Empathy and Compassion",
    description: "Assess genuine empathy, responsiveness to emotional cues, and ability to convey compassion.",
  },
  {
    title: "Active Listening",
    description: "Consider time allowed for patient speech, understanding through acknowledgment, and addressing concerns.",
  },
  {
    title: "Patient Education and Guidance",
    description: "Evaluate clarity in explaining medical concepts and adjusting based on patient understanding.",
  },
  {
    title: "Cultural Competence",
    description: "Assess sensitivity to cultural values and incorporation of patient beliefs into care discussions.",
  },
  {
    title: "Professionalism",
    description: "Evaluate tone, response to challenges, and maintenance of appropriate boundaries.",
  },
  {
    title: "Organization and Structure",
    description: "Consider logical flow of conversation and clarity in outlining important points.",
  },
  {
    title: "Patient-Centered Approach",
    description: "Assess partnership with the patient and focus on their needs and preferences.",
  },
  {
    title: "Responsiveness to Patient Feedback",
    description: "Evaluate adaptability based on patient responses and acknowledgment of emotions.",
  },
  {
    title: "Confidence and Comfort Level",
    description: "Assess confidence during interactions and ability to manage discomfort while providing care.",
  },
];

// Define props interface here
interface EvaluationTabProps {
  scores: Record<number, string>;
  setScores: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  notes: string;
  setNotes: React.Dispatch<React.SetStateAction<string>>;
}

// Define component here
const EvaluationTab = ({ scores, setScores, notes, setNotes }: EvaluationTabProps) => {
  return (
    <ScrollArea className="h-full p-4"> 
      <div className="space-y-6"> 
        {evaluationCriteria.map((criterion, index) => (
          <div key={index} className="bg-white rounded-lg p-4 shadow-sm border"> 
            <h3 className="font-semibold text-lg mb-1 text-utexas-navy">{criterion.title}</h3>
            <p className="text-sm text-gray-600 mb-3">{criterion.description}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2"> 
              {["Poor", "Fair", "Satisfactory", "Very good", "Excellent"].map((option) => (
                <label key={option} className="flex items-center text-sm cursor-pointer">
                  <input 
                    type="radio" 
                    name={`criterion-${index}`} 
                    value={option} 
                    className="mr-1.5 h-4 w-4 text-utexas-orange focus:ring-utexas-orange border-gray-300" 
                    checked={scores[index] === option}
                    onChange={(e) => setScores(prev => ({ ...prev, [index]: e.target.value }))}
                  />
                  {option}
                </label>
              ))}
            </div>
          </div>
        ))}
        <div className="bg-white rounded-lg p-4 shadow-sm border">
           <h3 className="font-semibold text-lg mb-2 text-utexas-navy">Additional Notes</h3>
           <Textarea 
             placeholder="Enter any additional feedback or observations here..."
             rows={5}
             className="text-sm"
             value={notes}
             onChange={(e) => setNotes(e.target.value)}
           />
         </div>
      </div>
    </ScrollArea>
  );
};

export default EvaluationTab; 