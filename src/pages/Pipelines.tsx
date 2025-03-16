
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusIcon, FileTextIcon, ArrowRightIcon, CopyIcon, Trash2Icon, FileIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DocumentPipeline } from "@/types";
import { useToast } from "@/components/ui/use-toast";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/context/AuthContext";

export default function Pipelines() {
  const [pipelines, setPipelines] = useState<DocumentPipeline[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchPipelines();
    }
  }, [user]);

  const fetchPipelines = async () => {
    try {
      setIsLoading(true);
      // Using type assertion to handle the document_pipelines table
      const { data, error } = await supabase
        .from('document_pipelines' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      setPipelines(data || []);
    } catch (error) {
      console.error('Error fetching pipelines:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pipelines. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePipeline = () => {
    // Redirect to the process page
    navigate('/process');
  };

  const handleOpenPipeline = (id: string) => {
    navigate(`/pipelines/${id}`);
  };

  const handleDuplicatePipeline = async (id: string) => {
    try {
      const pipelineToDuplicate = pipelines.find(p => p.id === id);
      if (!pipelineToDuplicate) return;

      const { data, error } = await supabase
        .from('document_pipelines' as any)
        .insert({
          name: `${pipelineToDuplicate.name} (Copy)`,
          description: pipelineToDuplicate.description,
          schema_id: pipelineToDuplicate.schemaId,
          organization_id: user?.organizationId,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: 'Pipeline duplicated',
        description: 'Pipeline has been duplicated successfully.',
      });

      await fetchPipelines();
    } catch (error) {
      console.error('Error duplicating pipeline:', error);
      toast({
        title: 'Error',
        description: 'Failed to duplicate pipeline. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeletePipeline = async (id: string) => {
    try {
      const { error } = await supabase
        .from('document_pipelines' as any)
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: 'Pipeline deleted',
        description: 'Pipeline has been deleted successfully.',
      });

      setPipelines(pipelines.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting pipeline:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete pipeline. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Document Pipelines</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage document processing pipelines
          </p>
        </div>
        <Button onClick={handleCreatePipeline} className="gap-2">
          <PlusIcon className="h-4 w-4" /> New Pipeline
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="bg-muted/20 h-28"></CardHeader>
              <CardContent className="py-4">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardContent>
              <CardFooter className="bg-muted/10 h-14"></CardFooter>
            </Card>
          ))
        ) : pipelines.length > 0 ? (
          pipelines.map((pipeline) => (
            <Card key={pipeline.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="truncate">{pipeline.name}</CardTitle>
                  <Badge 
                    variant={
                      pipeline.status === 'completed' ? 'default' : 
                      pipeline.status === 'processing' ? 'secondary' : 
                      'outline'
                    }
                  >
                    {pipeline.status}
                  </Badge>
                </div>
                <CardDescription className="line-clamp-2">
                  {pipeline.description || 'No description provided'}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center">
                    <FileIcon className="h-4 w-4 mr-1 text-muted-foreground" />
                    <span className="text-sm">{pipeline.documentCount || 0} documents</span>
                  </div>
                </div>
                
                {pipeline.status === 'processing' && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Processing</span>
                      <span>{pipeline.progressCount || 0} of {pipeline.documentCount || 0}</span>
                    </div>
                    <Progress 
                      value={pipeline.documentCount ? (pipeline.progressCount / pipeline.documentCount) * 100 : 0} 
                      className="h-2" 
                    />
                  </div>
                )}
              </CardContent>
              <Separator />
              <CardFooter className="flex justify-between py-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 mr-2"
                  onClick={() => handleDuplicatePipeline(pipeline.id)}
                >
                  <CopyIcon className="h-4 w-4 mr-1" />
                  Duplicate
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1 ml-2"
                  onClick={() => handleOpenPipeline(pipeline.id)}
                >
                  Open <ArrowRightIcon className="h-4 w-4 ml-1" />
                </Button>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center text-center py-10">
            <div className="bg-muted/20 rounded-full p-4 mb-4">
              <FileTextIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No pipelines yet</h3>
            <p className="text-muted-foreground mb-4 max-w-md">
              Create your first document processing pipeline to start extracting structured data from your documents.
            </p>
            <Button onClick={handleCreatePipeline} className="gap-2">
              <PlusIcon className="h-4 w-4" /> Create Pipeline
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
