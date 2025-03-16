
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PlusCircle, FileText, Clock, CheckCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { DocumentPipeline } from "@/types";
import { Badge } from "@/components/ui/badge";

export default function Pipelines() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = React.useState(true);
  const [pipelines, setPipelines] = React.useState<DocumentPipeline[]>([]);

  React.useEffect(() => {
    if (user) {
      fetchPipelines();
    }
  }, [user]);

  const fetchPipelines = async () => {
    try {
      setIsLoading(true);
      
      // Short timeout to ensure we show loading state
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Use a more generic query approach since document_pipelines might not be in the types
      const { data, error } = await supabase
        .from('document_pipelines')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching pipelines:', error);
        throw error;
      }

      // Transform the database records to match the DocumentPipeline type
      const pipelinesList: DocumentPipeline[] = data ? data.map((pipeline: any) => ({
        id: pipeline.id,
        name: pipeline.name,
        description: pipeline.description || "",
        documentCount: pipeline.document_count || 0,
        status: pipeline.status as 'active' | 'processing' | 'completed',
        progressCount: pipeline.progress_count || 0,
        schemaId: pipeline.schema_id,
        createdAt: pipeline.created_at,
        updatedAt: pipeline.updated_at,
        organizationId: pipeline.organization_id || ""
      })) : [];
      
      setPipelines(pipelinesList);
    } catch (error) {
      console.error('Error fetching pipelines:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch pipelines",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Pipelines</h1>
        <Button onClick={() => navigate('/pipeline/new')} className="gap-2">
          <PlusCircle className="h-4 w-4" /> New Pipeline
        </Button>
      </div>
      
      <Separator className="my-6" />
      
      <div className="text-muted-foreground mb-8">
        <p>Pipelines allow you to standardize document processing workflows with predefined schemas and extraction rules.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          // Loading skeletons
          Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="overflow-hidden">
              <div className="p-6">
                <Skeleton className="h-5 w-1/2 mb-2" />
                <Skeleton className="h-4 w-3/4 mb-4" />
                <div className="flex justify-between mb-4">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3 mt-2" />
                <div className="flex justify-between mt-4">
                  <Skeleton className="h-9 w-20" />
                  <Skeleton className="h-9 w-20" />
                </div>
              </div>
            </Card>
          ))
        ) : pipelines.length > 0 ? (
          pipelines.map(pipeline => (
            <Card key={pipeline.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl flex justify-between items-center">
                  {pipeline.name}
                  <Badge variant={
                    pipeline.status === 'completed' ? 'secondary' : 
                    pipeline.status === 'processing' ? 'secondary' : 
                    'default'
                  }>
                    {pipeline.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{pipeline.description}</p>
                <div className="flex items-center justify-between text-sm mb-2">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-1 text-muted-foreground" />
                    <span>{pipeline.documentCount} documents</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                    <span>{new Date(pipeline.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                {pipeline.status === 'processing' && (
                  <div className="w-full bg-secondary h-2 rounded-full mt-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ 
                        width: `${pipeline.documentCount > 0 
                          ? Math.min(100, Math.round((pipeline.progressCount / pipeline.documentCount) * 100)) 
                          : 0}%` 
                      }}
                    />
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-0 flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={() => navigate(`/pipeline/${pipeline.id}/schema`)}
                >
                  View Schema
                </Button>
                <Button onClick={() => navigate(`/pipeline/${pipeline.id}`)}>
                  Open Pipeline
                </Button>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center p-12 border rounded-lg">
            <h3 className="text-lg font-medium mb-2">No pipelines found</h3>
            <p className="text-muted-foreground mb-4">Create your first pipeline to get started</p>
            <Button onClick={() => navigate('/pipeline/new')}>Create Pipeline</Button>
          </div>
        )}
      </div>
    </div>
  );
}
