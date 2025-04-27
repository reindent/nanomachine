import { useState, useEffect } from 'react';
import { ReactSortable } from 'react-sortablejs';

interface StrategyProps {
  plan: string;
  onPlanChange?: (newPlan: string) => void;
}

interface PlanStep {
  id: number;
  tool: string;
  description: string;
  completed: boolean;
}

export default function Strategy({ plan, onPlanChange }: StrategyProps) {
  // Parse the plan string into steps
  const parsePlan = (planText: string): PlanStep[] => {
    if (!planText) return [];
    
    const lines = planText.split('\n').filter(line => line.trim() !== '');
    
    return lines.map((line, index) => {
      // Extract the tool from brackets at the beginning of the line
      const toolMatch = line.match(/^\d+\.\s*\[(BROWSER|SHELL|DATA)\]/i);
      const tool = toolMatch ? toolMatch[1].toUpperCase() : 'UNKNOWN';
      
      // Remove the tool and number prefix to get the description
      const description = line.replace(/^\d+\.\s*\[(BROWSER|SHELL|DATA)\]\s*/i, '').trim();
      
      return {
        id: index,
        tool,
        description,
        completed: false
      };
    });
  };

  const [steps, setSteps] = useState<PlanStep[]>(parsePlan(plan));
  const [editingStep, setEditingStep] = useState<number | null>(null);
  const [editText, setEditText] = useState<string>('');
  
  // Update steps when plan changes
  useEffect(() => {
    setSteps(parsePlan(plan));
  }, [plan]);

  // Get tool color based on tool type
  const getToolColor = (tool: string) => {
    switch (tool.toUpperCase()) {
      case 'BROWSER':
        return 'bg-blue-100 text-blue-800';
      case 'SHELL':
        return 'bg-green-100 text-green-800';
      case 'DATA':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Start editing a step
  const startEditing = (id: number) => {
    const step = steps.find(s => s.id === id);
    if (step) {
      setEditText(`[${step.tool}] ${step.description}`);
      setEditingStep(id);
    }
  };

  // Save edited step
  const saveEdit = () => {
    if (editingStep === null) return;
    
    // Extract tool and description from edit text
    const toolMatch = editText.match(/^\[(BROWSER|SHELL|DATA)\]/i);
    const tool = toolMatch ? toolMatch[1].toUpperCase() : 'UNKNOWN';
    const description = editText.replace(/^\[(BROWSER|SHELL|DATA)\]\s*/i, '').trim();
    
    const newSteps = steps.map(step => 
      step.id === editingStep 
        ? { ...step, tool, description } 
        : step
    );
    
    setSteps(newSteps);
    setEditingStep(null);
    
    // If there's an onPlanChange callback, update the plan
    if (onPlanChange) {
      const newPlan = newSteps.map((step, index) => 
        `${index + 1}. [${step.tool}] ${step.description}`
      ).join('\n');
      onPlanChange(newPlan);
    }
  };

  // Delete a step
  const deleteStep = (id: number) => {
    const newSteps = steps.filter(s => s.id !== id);
    setSteps(newSteps);
    if (onPlanChange) {
      const newPlan = newSteps.map((step, index) => 
        `${index + 1}. [${step.tool}] ${step.description}`
      ).join('\n');
      onPlanChange(newPlan);
    }
  };
  
  // Cancel editing
  const cancelEdit = () => {
    setEditingStep(null);
  };

  // Handle list reordering
  const handleListUpdate = (newList: PlanStep[]) => {
    setSteps(newList);
    
    // If onPlanChange is provided, update the plan
    if (onPlanChange) {
      const newPlan = newList.map((step, index) => 
        `${index + 1}. [${step.tool}] ${step.description}`
      ).join('\n');
      onPlanChange(newPlan);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow border-gray-200 border p-4 mb-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-semibold">Strategy Plan</h2>
        <button 
          className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
          onClick={() => {
            // Add a new step at the end
            const newStep: PlanStep = {
              id: steps.length,
              tool: 'BROWSER',
              description: 'New step',
              completed: false
            };
            const newSteps = [...steps, newStep];
            setSteps(newSteps);
            startEditing(newStep.id);
          }}
        >
          + Add Step
        </button>
      </div>
      
      {steps.length === 0 ? (
        <div className="text-gray-500 text-center py-4 text-xs">Create your strategy by chatting or add steps manually.</div>
      ) : (
        <ReactSortable 
          list={steps} 
          setList={handleListUpdate}
          animation={150}
          tag="ul"
          className="space-y-2"
        >
          {steps.map((step, index) => (
            <li key={step.id} className={`border rounded p-2 ${step.completed ? 'bg-gray-50' : 'bg-white'}`}>
              {editingStep === step.id ? (
                <div className="flex flex-col space-y-2">
                  <input
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="border rounded px-2 py-1 w-full"
                    autoFocus
                  />
                  <div className="flex justify-end space-x-2">
                    <button 
                      onClick={cancelEdit}
                      className="text-xs text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={saveEdit}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start">
                  <div className="text-gray-400 mr-2 cursor-move">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                    </svg>
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center">
                      <span className="text-xs mr-2">{index + 1}.</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${getToolColor(step.tool)} mr-2`}>
                        {step.tool}
                      </span>
                      <span className="text-xs">
                        {step.description}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => startEditing(step.id)}
                    className="text-gray-400 hover:text-gray-600 ml-2 cursor-pointer"
                  >
                    {/* edit icon */}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button 
                    onClick={() => deleteStep(step.id)}
                    className="text-gray-400 hover:text-gray-600 ml-2 cursor-pointer"
                  >
                    {/* delete icon */}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </li>
          ))}
        </ReactSortable>
      )}
    </div>
  );
}
