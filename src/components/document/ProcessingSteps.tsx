
import * as React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AIProcessingStep } from "@/types";
import { CheckIcon, Clock, AlertCircle, RotateCw, ArrowRight, FileText, Table, Image, FileCode } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PageDetail {
  pageNumber: number;
  status: "waiting" | "processing" | "completed" | "failed";
  thumbnail?: string;
  text?: string;
  error?: string;
}

interface DocumentProcessDetail {
  id: string;
  name: string;
  pageCount: number;
  processedPages: number;
  status: "waiting" | "processing" | "completed" | "failed";
  pages: PageDetail[];
  thumbnail?: string;
  error?: string;
}

interface ProcessingStepsProps {
  steps: AIProcessingStep[];
  onStartProcessing?: () => void;
  onViewResults?: () => void;
  isProcessingComplete: boolean;
  className?: string;
  documentCount?: number;
  processedDocuments?: number;
  schemaDetails?: {
    tables: number;
    fields: number;
  };
  documentDetails?: DocumentProcessDetail[];
}

export function ProcessingSteps({
  steps,
  onStartProcessing,
  onViewResults,
  isProcessingComplete,
  className,
  documentCount = 0,
  processedDocuments = 0,
  schemaDetails = { tables: 0, fields: 0 },
  documentDetails = []
}: ProcessingStepsProps) {
  const hasInProgress = steps.some((step) => step.status === "in_progress");
  const hasFailed = steps.some((step) => step.status === "failed");
  const [openSteps, setOpenSteps] = React.useState<string[]>([]);
  
  React.useEffect(() => {
    // Automatically expand steps that are in progress
    const inProgressStepIds = steps
      .filter(step => step.status === "in_progress")
      .map(step => step.id);
    
    if (inProgressStepIds.length > 0) {
      setOpenSteps(prev => [...new Set([...prev, ...inProgressStepIds])]);
    }
  }, [steps]);

  const toggleStep = (stepId: string) => {
    setOpenSteps(prev => 
      prev.includes(stepId) 
        ? prev.filter(id => id !== stepId) 
        : [...prev, stepId]
    );
  };
  
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

  const getStatusIndicator = (status: "waiting" | "processing" | "completed" | "failed") => {
    switch (status) {
      case "waiting":
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case "processing":
        return <RotateCw className="h-4 w-4 text-primary animate-spin" />;
      case "completed":
        return <CheckIcon className="h-4 w-4 text-green-500" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
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
            <Collapsible 
              key={step.id} 
              className="relative"
              open={openSteps.includes(step.id)}
              onOpenChange={() => toggleStep(step.id)}
            >
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
                    <CollapsibleTrigger className="flex items-center gap-2 font-medium hover:underline cursor-pointer">
                      <h4>{step.name}</h4>
                    </CollapsibleTrigger>
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

                  <CollapsibleContent>
                    <div className="mt-2 p-3 bg-muted/30 rounded-md text-sm">
                      {step.name === "Document Upload" && (
                        <div className="space-y-1">
                          <p><strong>Documents:</strong> {documentCount} total</p>
                          <p><strong>Status:</strong> {step.status === "completed" ? `${documentCount} uploaded successfully` : `${processedDocuments} of ${documentCount} uploaded`}</p>
                          
                          {documentDetails.length > 0 && (
                            <div className="mt-2 space-y-2">
                              <p className="font-medium">Document Details:</p>
                              {documentDetails.map(doc => (
                                <div key={doc.id} className="border rounded p-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <FileText className="h-4 w-4" />
                                      <span className="font-medium">{doc.name}</span>
                                    </div>
                                    <Badge variant={
                                      doc.status === "completed" ? "default" : 
                                      doc.status === "processing" ? "secondary" : 
                                      doc.status === "failed" ? "destructive" : "outline"
                                    }>
                                      {getStatusIndicator(doc.status)}
                                      <span className="ml-1">{doc.status}</span>
                                    </Badge>
                                  </div>
                                  {doc.thumbnail && (
                                    <div className="mt-2 flex justify-center">
                                      <img 
                                        src={doc.thumbnail} 
                                        alt={`Thumbnail for ${doc.name}`}
                                        className="h-20 object-contain border rounded"
                                      />
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {step.name === "Document Transcription" && (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <p><strong>Documents:</strong> {documentCount} total</p>
                            <p><strong>Pages processed:</strong> {processedDocuments} of {documentCount * 5} (est.)</p>
                          </div>
                          
                          {documentDetails.length > 0 && (
                            <ScrollArea className="h-[300px] pr-4 mt-2">
                              <div className="space-y-4">
                                {documentDetails.map(doc => (
                                  <div key={doc.id} className="border rounded p-2">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        <span className="font-medium">{doc.name}</span>
                                      </div>
                                      <Badge variant={
                                        doc.status === "completed" ? "default" : 
                                        doc.status === "processing" ? "secondary" : 
                                        doc.status === "failed" ? "destructive" : "outline"
                                      }>
                                        {getStatusIndicator(doc.status)}
                                        <span className="ml-1">{doc.status}</span>
                                      </Badge>
                                    </div>
                                    
                                    <Progress 
                                      value={(doc.processedPages / Math.max(1, doc.pageCount)) * 100} 
                                      className="h-2 mb-2"
                                    />
                                    
                                    <p className="text-xs text-muted-foreground mb-2">
                                      {doc.processedPages} of {doc.pageCount} pages processed
                                    </p>
                                    
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                                      {doc.pages.map(page => (
                                        <div key={`${doc.id}-page-${page.pageNumber}`} className="border rounded p-1 relative">
                                          {page.thumbnail ? (
                                            <div className="relative">
                                              <img 
                                                src={page.thumbnail} 
                                                alt={`Page ${page.pageNumber}`}
                                                className="w-full h-24 object-contain"
                                              />
                                              <div className="absolute top-0 right-0 m-1">
                                                <Badge className="text-xs">{page.pageNumber}</Badge>
                                              </div>
                                              <div className="absolute bottom-0 right-0 m-1">
                                                {getStatusIndicator(page.status)}
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="h-24 flex items-center justify-center bg-muted/20">
                                              <div className="flex flex-col items-center">
                                                <Image className="h-8 w-8 text-muted-foreground/50" />
                                                <div className="text-xs text-muted-foreground mt-1">
                                                  Page {page.pageNumber}
                                                </div>
                                                <Badge variant="outline" className="mt-1">
                                                  {page.status}
                                                </Badge>
                                              </div>
                                            </div>
                                          )}
                                          
                                          {page.status === "completed" && page.text && (
                                            <div className="mt-1 text-xs text-muted-foreground truncate">
                                              <FileCode className="h-3 w-3 inline mr-1" />
                                              {page.text.substring(0, 30)}...
                                            </div>
                                          )}
                                          
                                          {page.status === "failed" && (
                                            <div className="mt-1 text-xs text-destructive">
                                              {page.error || "Failed to process"}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          )}
                        </div>
                      )}
                      
                      {step.name === "Schema Generation" && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Table className="h-4 w-4" />
                            <p><strong>Tables identified:</strong> {schemaDetails.tables}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <p><strong>Fields identified:</strong> {schemaDetails.fields}</p>
                          </div>
                          <p><strong>Documents analyzed:</strong> {processedDocuments} of {documentCount}</p>
                          
                          {documentDetails.length > 0 && (
                            <div className="mt-3 p-2 bg-muted/30 rounded">
                              <p className="font-medium mb-2">Schema extraction progress:</p>
                              <div className="space-y-2">
                                {documentDetails.map(doc => (
                                  <div key={doc.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <FileText className="h-4 w-4" />
                                      <span className="text-sm">{doc.name}</span>
                                    </div>
                                    <Badge variant={
                                      doc.status === "completed" ? "default" : 
                                      doc.status === "processing" ? "secondary" : 
                                      doc.status === "failed" ? "destructive" : "outline"
                                    }>
                                      {getStatusIndicator(doc.status)}
                                      <span className="ml-1">{doc.status}</span>
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {step.name === "Schema Refinement" && (
                        <div className="space-y-1">
                          <p><strong>Schema status:</strong> {step.status === "completed" ? 'Finalized' : 'Awaiting approval'}</p>
                          <p><strong>Suggested improvements:</strong> {schemaDetails.tables > 0 ? '5 potential optimizations identified' : 'None yet'}</p>
                          
                          {schemaDetails.tables > 0 && (
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              <div className="border rounded p-2">
                                <p className="font-medium text-xs mb-1">Field Type Distribution</p>
                                <div className="h-4 bg-muted rounded-full overflow-hidden flex">
                                  <div className="bg-blue-500 h-full" style={{ width: '40%' }}></div>
                                  <div className="bg-green-500 h-full" style={{ width: '30%' }}></div>
                                  <div className="bg-yellow-500 h-full" style={{ width: '20%' }}></div>
                                  <div className="bg-red-500 h-full" style={{ width: '10%' }}></div>
                                </div>
                                <div className="flex justify-between text-xs mt-1">
                                  <span>String</span>
                                  <span>Number</span>
                                  <span>Date</span>
                                  <span>Bool</span>
                                </div>
                              </div>
                              
                              <div className="border rounded p-2">
                                <p className="font-medium text-xs mb-1">Confidence Score</p>
                                <div className="flex items-center gap-2">
                                  <Progress value={85} className="h-2 flex-1" />
                                  <span className="text-xs font-medium">85%</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  High confidence in schema extraction
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </div>
            </Collapsible>
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
