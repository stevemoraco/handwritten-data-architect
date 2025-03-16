
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, ArrowRight, FileText, Layers } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

// Example pipeline types
interface Pipeline {
  id: string;
  name: string;
  description: string;
  documentCount: number;
  schemaCount: number;
  lastUpdated: string;
  status: "active" | "draft" | "archived";
}

export default function Pipelines() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pipelines, setPipelines] = React.useState<Pipeline[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Simulate fetching pipelines
  React.useEffect(() => {
    const fetchPipelines = async () => {
      try {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Mock data
        const mockPipelines: Pipeline[] = [
          {
            id: "1",
            name: "Health Survey Analysis",
            description: "Processing health surveys and extracting patient data",
            documentCount: 24,
            schemaCount: 3,
            lastUpdated: "2025-03-15T09:30:00Z",
            status: "active"
          },
          {
            id: "2",
            name: "Financial Reports",
            description: "Extract financial data from quarterly reports",
            documentCount: 8,
            schemaCount: 2,
            lastUpdated: "2025-03-12T14:20:00Z",
            status: "draft"
          }
        ];
        
        setPipelines(mockPipelines);
      } catch (error) {
        console.error("Error fetching pipelines:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPipelines();
  }, []);

  const getStatusBadgeVariant = (status: Pipeline["status"]) => {
    switch (status) {
      case "active":
        return "default";
      case "draft":
        return "secondary";
      case "archived":
        return "outline";
      default:
        return "outline";
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
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-1/2 mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent>
                <div className="flex justify-between mb-4">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3 mt-2" />
              </CardContent>
              <CardFooter className="flex justify-between">
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-9 w-20" />
              </CardFooter>
            </Card>
          ))
        ) : pipelines.length > 0 ? (
          pipelines.map((pipeline) => (
            <Card key={pipeline.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{pipeline.name}</CardTitle>
                  <Badge variant={getStatusBadgeVariant(pipeline.status)}>
                    {pipeline.status}
                  </Badge>
                </div>
                <CardDescription>{pipeline.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between mb-4">
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{pipeline.documentCount} documents</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{pipeline.schemaCount} schemas</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Last updated {new Date(pipeline.lastUpdated).toLocaleDateString()}
                </p>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" size="sm">Edit</Button>
                <Button size="sm" className="gap-1">
                  View <ArrowRight className="h-3 w-3" />
                </Button>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center p-8 border rounded-lg">
            <h3 className="text-lg font-medium mb-2">No pipelines found</h3>
            <p className="text-muted-foreground mb-4">Create your first pipeline to get started</p>
            <Button onClick={() => navigate('/pipeline/new')}>Create Pipeline</Button>
          </div>
        )}
      </div>
    </div>
  );
}
