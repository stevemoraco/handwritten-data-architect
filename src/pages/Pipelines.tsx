
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PlusIcon, FolderIcon, Settings2Icon, BoxesIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

// Mock pipelines data
const PIPELINES = [
  {
    id: "p1",
    name: "Invoice Processing",
    description: "Extract data from invoices and receipts",
    documentCount: 12,
    lastProcessed: "2023-11-15T14:30:00Z",
    status: "active"
  },
  {
    id: "p2",
    name: "Health Surveys",
    description: "Process patient health questionnaires",
    documentCount: 8,
    lastProcessed: "2023-11-10T09:15:00Z",
    status: "active"
  },
  {
    id: "p3",
    name: "Legal Contracts",
    description: "Extract clauses and terms from legal documents",
    documentCount: 5,
    lastProcessed: "2023-11-05T16:45:00Z",
    status: "draft"
  }
];

export default function Pipelines() {
  const navigate = useNavigate();

  const handleCreatePipeline = () => {
    // In a real app, this would navigate to a pipeline creation form
    navigate('/pipelines/new');
  };

  const handleViewPipeline = (pipelineId: string) => {
    navigate(`/pipelines/${pipelineId}`);
  };

  return (
    <div className="container py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Document Pipelines</h1>
        <Button onClick={handleCreatePipeline} className="gap-2">
          <PlusIcon className="h-4 w-4" /> New Pipeline
        </Button>
      </div>
      
      <p className="text-muted-foreground mt-2">
        Create and manage automated document processing workflows
      </p>
      
      <Separator className="my-6" />
      
      {PIPELINES.length === 0 ? (
        <div className="text-center py-16 border rounded-lg bg-muted/20">
          <BoxesIcon className="h-12 w-12 mx-auto text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No pipelines found</h3>
          <p className="text-muted-foreground mt-1">
            Create a pipeline to start processing documents automatically
          </p>
          <Button 
            onClick={handleCreatePipeline} 
            variant="outline" 
            className="mt-4"
          >
            Create your first pipeline
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PIPELINES.map((pipeline) => (
            <Card key={pipeline.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{pipeline.name}</CardTitle>
                  <Badge variant={pipeline.status === "active" ? "default" : "outline"}>
                    {pipeline.status === "active" ? "Active" : "Draft"}
                  </Badge>
                </div>
                <CardDescription>{pipeline.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Documents:</span>
                    <span className="font-medium">{pipeline.documentCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last processed:</span>
                    <span className="font-medium">
                      {new Date(pipeline.lastProcessed).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" size="sm" className="w-full" onClick={() => handleViewPipeline(pipeline.id)}>
                  View Pipeline
                </Button>
                <Button variant="ghost" size="icon" className="ml-2">
                  <Settings2Icon className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
