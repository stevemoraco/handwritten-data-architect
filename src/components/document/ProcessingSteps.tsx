
import * as React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AIProcessingStep } from "@/types";
import { CheckIcon, Clock, AlertCircle, RotateCw, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProcessingStepsProps {
  steps: AIProcessingStep[];
  onStartProcessing?: () => void;
  onViewResults?: () => void;
  isProcessingComplete: boolean;
  className?: string;
}

export function ProcessingSteps({
  steps,
  onStartProcessing,
  onViewResults,
  isProcessingComplete,
  className,
}: ProcessingStepsProps) {
  const hasInProgress = steps.some((step) => step.status === "in_progress");
  const hasFailed = steps.some((step) => step.status === "failed");
  
  const getStepIcon = (status: AIProcessingStep["status"]) => {
    switch (status) {
      case "waiting":
        return <Clock className="h-5 w-5 text-muted-foreground" />;
      case "in_progress":
        return <RotateCw className="h-5 w-5 text-primary animate-spin" />;
      case "completed":
        return <CheckIcon className="h-5 w-5 text-green-500" />;
      case "failed":
        return <AlertCircle className="h-5 w-5 text-destructive" />;
    }
  };

  const getStepBadge = (status: AIProcessingStep["status"]) => {
    switch (status) {
      case "waiting":
        return <Badge variant="outline">Waiting</Badge>;
      case "in_progress":
        return <Badge variant="secondary">In Progress</Badge>;
      case "completed":
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
    }
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="text-lg">Processing Steps</CardTitle>
        <CardDescription>
          Document analysis and processing workflow
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {steps.map((step, index) => (
            <div key={step.id} className="relative">
              {index < steps.length - 1 && (
                <div className="absolute left-[22px] top-[40px] h-[calc(100%-24px)] w-px bg-border" />
              )}
              
              <div className="flex items-start gap-4">
                <div className={cn(
                  "rounded-full p-2 w-11 h-11 flex items-center justify-center",
                  step.status === "in_progress" && "bg-primary/10",
                  step.status === "completed" && "bg-green-500/10",
                  step.status === "failed" && "bg-destructive/10"
                )}>
                  {getStepIcon(step.status)}
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{step.name}</h4>
                    {getStepBadge(step.status)}
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                  
                  {step.status === "in_progress" && step.progress !== undefined && (
                    <Progress value={step.progress} className="h-2" />
                  )}
                  
                  {step.error && (
                    <p className="text-sm text-destructive">{step.error}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between border-t pt-4">
        {!isProcessingComplete && !hasInProgress && (
          <Button onClick={onStartProcessing} disabled={hasInProgress}>
            {hasFailed ? "Retry Processing" : "Start Processing"}
          </Button>
        )}
        
        {isProcessingComplete && (
          <Button onClick={onViewResults}>
            View Results <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
        
        {hasInProgress && (
          <div className="flex items-center text-sm text-muted-foreground">
            <RotateCw className="mr-2 h-4 w-4 animate-spin" />
            Processing in progress...
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
