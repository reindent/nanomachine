import { useState, useEffect } from 'react';
import { ReactSortable } from 'react-sortablejs';

// Define available tool types
const TOOL_TYPES = ['BROWSER', 'SHELL', 'DATA'];

// Interface for a strategy step from the server
export interface IStrategyStep {
  id: string;
  stepNumber: number;
  tool: string;
  description: string;
  taskIds: string[];
  lastModified: Date;
}

// Interface for a version of the strategy plan
export interface IStrategyVersion {
  versionNumber: number;
  description: string;
  steps: IStrategyStep[];
  createdAt: Date;
  createdBy: string;
}

// Main StrategyPlan interface
export interface IStrategyPlan {
  chatId: string;
  description: string;
  versions: IStrategyVersion[];
  currentVersion: number;
  lastExecutedAt?: Date;
  executionCount: number;
}

// Props for the Strategy component
interface StrategyProps {
  plan: IStrategyPlan;
  onPlanChange?: (newPlan: IStrategyPlan) => void;
}

// Simplified step interface for internal component use
interface PlanStep {
  id: string;
  tool: string;
  description: string;
}

export default function Strategy({ plan, onPlanChange }: StrategyProps) {
  // Convert the plan's active version steps to our internal format
  const getActiveSteps = (strategyPlan: IStrategyPlan): PlanStep[] => {
    if (!strategyPlan || !strategyPlan.versions || strategyPlan.versions.length === 0) {
      return [];
    }
    
    // Find the active version
    const activeVersion = strategyPlan.versions.find(v => v.versionNumber === strategyPlan.currentVersion);
    
    if (!activeVersion || !activeVersion.steps) {
      return [];
    }
    
    // Convert to our internal format
    return activeVersion.steps.map(step => ({
      id: step.id,
      tool: step.tool,
      description: step.description,
    }));
  };

  const [steps, setSteps] = useState<PlanStep[]>(getActiveSteps(plan));
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');
  const [editTool, setEditTool] = useState<string>('BROWSER');
  
  // Update steps when plan changes
  useEffect(() => {
    setSteps(getActiveSteps(plan));
  }, [plan]);

  // Get tool color based on tool type
  const getToolColor = (tool: string) => {
    switch (tool) {
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
  const startEditing = (id: string) => {
    const step = steps.find(s => s.id === id);
    if (step) {
      setEditText(step.description);
      setEditTool(step.tool);
      setEditingStep(id);
    }
  };

  // Save edited step
  const saveEdit = () => {
    if (editingStep === null) return;
    
    // Prevent empty descriptions
    if (!editText.trim()) {
      alert('Step description cannot be empty');
      return; // Don't save if description is empty
    }
    
    const newSteps = steps.map(step => 
      step.id === editingStep 
        ? { ...step, tool: editTool, description: editText.trim() } 
        : step
    );
    
    setSteps(newSteps);
    setEditingStep(null);
    
    // If there's an onPlanChange callback, update the plan
    if (onPlanChange && plan) {
      // Create a deep copy of the plan
      const updatedPlan = JSON.parse(JSON.stringify(plan)) as IStrategyPlan;
      
      // Find the active version
      const activeVersionIndex = updatedPlan.versions.findIndex(v => v.versionNumber === updatedPlan.currentVersion);
      
      if (activeVersionIndex >= 0) {
        // Update the steps in the active version
        updatedPlan.versions[activeVersionIndex].steps = newSteps.map(step => ({
          id: step.id,
          stepNumber: updatedPlan.versions[activeVersionIndex].steps.find(s => s.id === step.id)?.stepNumber || 0,
          tool: step.tool as 'BROWSER' | 'SHELL' | 'DATA',
          description: step.description,
          taskIds: updatedPlan.versions[activeVersionIndex].steps.find(s => s.id === step.id)?.taskIds || [],
          lastModified: new Date()
        }));
        
        onPlanChange(updatedPlan);
      }
    }
  };

  // Delete a step
  const deleteStep = (id: string) => {
    const newSteps = steps.filter(s => s.id !== id);
    setSteps(newSteps);
    
    if (onPlanChange && plan) {
      // Create a deep copy of the plan
      const updatedPlan = JSON.parse(JSON.stringify(plan)) as IStrategyPlan;
      
      // Find the active version
      const activeVersionIndex = updatedPlan.versions.findIndex(v => v.versionNumber === updatedPlan.currentVersion);
      
      if (activeVersionIndex >= 0) {
        // Update the steps in the active version
        updatedPlan.versions[activeVersionIndex].steps = updatedPlan.versions[activeVersionIndex].steps
          .filter(step => step.id !== id)
          .map((step, idx) => ({
            ...step,
            stepNumber: idx + 1
          }));
        
        onPlanChange(updatedPlan);
      }
    }
  };
  
  // Cancel editing
  const cancelEdit = () => {
    setEditingStep(null);
  };

  // Add a new step
  const addStep = () => {
    // Generate a unique ID for the new step
    const newId = `step-${Date.now()}`;
    
    const newStep: PlanStep = {
      id: newId,
      tool: 'BROWSER',
      description: 'New step',
    };
    
    const newSteps = [...steps, newStep];
    setSteps(newSteps);
    startEditing(newId);
    
    if (onPlanChange && plan) {
      // Create a deep copy of the plan
      const updatedPlan = JSON.parse(JSON.stringify(plan)) as IStrategyPlan;
      
      // Find the active version
      const activeVersionIndex = updatedPlan.versions.findIndex(v => v.versionNumber === updatedPlan.currentVersion);
      
      if (activeVersionIndex >= 0) {
        // Add the new step
        updatedPlan.versions[activeVersionIndex].steps.push({
          id: newId,
          stepNumber: updatedPlan.versions[activeVersionIndex].steps.length + 1,
          tool: 'BROWSER',
          description: 'New step',
          taskIds: [],
          lastModified: new Date()
        });
        
        onPlanChange(updatedPlan);
      }
    }
  };

  // Handle step reordering
  const handleStepReorder = (newOrder: PlanStep[]) => {
    setSteps(newOrder);
    
    if (onPlanChange && plan) {
      // Create a deep copy of the plan
      const updatedPlan = JSON.parse(JSON.stringify(plan)) as IStrategyPlan;
      
      // Find the active version
      const activeVersionIndex = updatedPlan.versions.findIndex(v => v.versionNumber === updatedPlan.currentVersion);
      
      if (activeVersionIndex >= 0) {
        // Reorder the steps based on the new order
        const reorderedSteps = newOrder.map((step, idx) => {
          const originalStep = updatedPlan.versions[activeVersionIndex].steps.find(s => s.id === step.id);
          if (originalStep) {
            return {
              ...originalStep,
              stepNumber: idx + 1,
              lastModified: new Date()
            };
          }
          return null;
        }).filter(Boolean) as IStrategyStep[];
        
        updatedPlan.versions[activeVersionIndex].steps = reorderedSteps;
        onPlanChange(updatedPlan);
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow border-gray-200 border p-4 mb-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-semibold">Strategy Plan</h2>
        <button 
          className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
          onClick={addStep}
        >
          + Add Step
        </button>
      </div>
      
      {steps.length === 0 ? (
        <div className="text-gray-500 text-center py-4 text-xs">Create your strategy by chatting or add steps manually.</div>
      ) : (
        <ReactSortable 
          list={steps} 
          setList={handleStepReorder}
          animation={150}
          tag="ul"
          className="space-y-2"
        >
          {steps.map((step, index) => (
            <li key={step.id} className={`border rounded p-2`}>
              {editingStep === step.id ? (
                <div className="flex flex-col space-y-2">
                  <div className="flex space-x-2">
                    <select 
                      value={editTool} 
                      onChange={e => setEditTool(e.target.value)}
                      className="text-xs px-2 py-1 border rounded"
                    >
                      {TOOL_TYPES.map(tool => (
                        <option key={tool} value={tool}>{tool}</option>
                      ))}
                    </select>
                    <input 
                      type="text" 
                      value={editText} 
                      onChange={e => setEditText(e.target.value)}
                      className="flex-1 text-xs px-2 py-1 border rounded"
                      placeholder="Step description"
                      autoFocus
                    />
                  </div>
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
                <div className="flex flex-row items-start">
                  <div className="text-gray-400 mr-1 cursor-move">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                    </svg>
                  </div>
                  <div className="flex mr-2 text-xs">{index + 1}.</div>
                  <div className="flex-1">
                    <div className="flex items-center mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${getToolColor(step.tool)} mr-2`}>
                        {step.tool}
                      </span>
                      <span className={`text-xs flex-1`}>
                        {step.description}
                      </span>
                      <button 
                        onClick={() => startEditing(step.id)}
                        className="text-xs text-gray-500 hover:text-gray-700 ml-2"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => deleteStep(step.id)}
                        className="text-xs text-red-500 hover:text-red-700 ml-2"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ReactSortable>
      )}
      
      {steps.length > 0 && (
        <div className="flex justify-start mt-4">
          <button 
            className="cursor-pointer bg-blue-500 hover:bg-blue-700 text-white text-xs font-medium py-1.5 px-4 rounded-md shadow-sm transition-colors flex items-center"
          >
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Execute Plan
          </button>
        </div>
      )}
    </div>
  );
}
