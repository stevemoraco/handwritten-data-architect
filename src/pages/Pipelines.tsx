
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PlusCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

export default function Pipelines() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);

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
