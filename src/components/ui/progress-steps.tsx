
import * as React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Step {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface ProgressStepsProps {
  steps: Step[];
  currentStep: string;
  className?: string;
}

export function ProgressSteps({ steps, currentStep, className }: ProgressStepsProps) {
  const currentStepIndex = steps.findIndex(step => step.id === currentStep);
  
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-center">
        {steps.map((step, index) => {
          const isActive = index === currentStepIndex;
          const isCompleted = index < currentStepIndex;
          
          return (
            <React.Fragment key={step.id}>
              {index > 0 && (
                <div 
                  className={cn(
                    "h-1 w-10 sm:w-16 md:w-24", 
                    isCompleted ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
              
              <div className="flex flex-col items-center gap-2">
                <div 
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2",
                    isActive 
                      ? "border-primary bg-primary/10 text-primary" 
                      : isCompleted 
                        ? "border-primary bg-primary text-primary-foreground" 
                        : "border-muted bg-muted/50 text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    step.icon || <span>{index + 1}</span>
                  )}
                </div>
                
                <span 
                  className={cn(
                    "text-xs font-medium sm:text-sm",
                    isActive 
                      ? "text-primary" 
                      : isCompleted 
                        ? "text-foreground" 
                        : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
