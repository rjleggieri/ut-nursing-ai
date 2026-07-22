import type { Dispatch, SetStateAction } from "react";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { evaluationCriteria } from "@/data/evaluationCriteria";

interface EvaluationTabProps {
  scores: Record<number, string>;
  setScores: Dispatch<SetStateAction<Record<number, string>>>;
  notes: string;
  setNotes: Dispatch<SetStateAction<string>>;
}

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
