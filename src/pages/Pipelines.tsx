
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PlusIcon, BoxesIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

interface Pipeline {
  id: string;
  name: string;
  description: string;
  document_count: number;
  last_processed: string | null;
  status: "active" | "draft";
  created_at: string;
}

export default function Pipelines() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pipelines, setPipelines] = React.useState<Pipeline[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (user) {
      fetchPipelines();
    }
  }, [user]);

  const fetchPipelines = async () => {
    try {
      setIsLoading(true);
      // Fetch real pipelines data from database
      const { data, error } = await supabase
        .from('document_pipelines')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      if (data) {
        setPipelines(data as Pipeline[]);
      }
    } catch (error) {
      console.error("Error fetching pipelines:", error);
      toast({
        title: "Error",
        description: "Failed to fetch pipelines",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePipeline = async () => {
    // Navigate to document selection page
    navigate('/documents');
    
    toast({
      title: "Pipeline Creation",
      description: "Please select documents to process in a pipeline",
    });
  };

  const handleViewPipeline = (pipelineId: string) => {
    navigate(`/pipelines/${pipelineId}`);
  };

  if (isLoading) {
    return (
      <div className="container py-10">
        <h1 className="text-3xl font-bold mb-6">Document Pipelines</h1>
        <Separator className="my-6" />
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <p className="text-muted-foreground">Loading pipelines...</p>
        </div>
      </div>
    );
  }

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
      
      {pipelines.length === 0 ? (
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
          {pipelines.map((pipeline) => (
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
                    <span className="font-medium">{pipeline.document_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last processed:</span>
                    <span className="font-medium">
                      {pipeline.last_processed 
                        ? new Date(pipeline.last_processed).toLocaleDateString() 
                        : "Never"}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => handleViewPipeline(pipeline.id)}
                >
                  View Pipeline
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
