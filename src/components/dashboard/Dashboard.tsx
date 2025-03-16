
import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { File, Plus, FileText, Layers, ArrowRight } from "lucide-react";
import { useDocuments } from "@/context/DocumentContext";
import { DocumentCard } from "@/components/document/DocumentCard";
import { Empty } from "@/components/ui/empty";

export function Dashboard() {
  const navigate = useNavigate();
  const { documents, schemas } = useDocuments();
  
  // Sort documents by createdAt date, newest first
  const recentDocuments = [...documents]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);
    
  const handleStartProcessing = () => {
    navigate("/process");
  };
  
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Upload handwritten documents and let AI extract structured data.
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documents.length}</div>
            <p className="text-xs text-muted-foreground">
              Documents uploaded to the system
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processed Documents</CardTitle>
            <File className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {documents.filter(doc => doc.status === "processed").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Documents fully processed and analyzed
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Schemas Created</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{schemas.length}</div>
            <p className="text-xs text-muted-foreground">
              Data schemas generated from documents
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Recent Documents</h3>
          <Button variant="outline" onClick={handleStartProcessing}>
            <Plus className="mr-2 h-4 w-4" /> New Upload
          </Button>
        </div>
        
        {recentDocuments.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recentDocuments.map((document) => (
              <DocumentCard
                key={document.id}
                document={document}
                onView={() => {}}
                onProcess={() => {}}
                onDelete={() => {}}
              />
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <Empty
                icon={<FileText className="h-8 w-8 text-muted-foreground" />}
                title="No documents yet"
                description="Upload your first document to get started."
                action={
                  <Button onClick={handleStartProcessing}>
                    <Plus className="mr-2 h-4 w-4" /> Upload Document
                  </Button>
                }
              />
            </CardContent>
          </Card>
        )}
        
        {recentDocuments.length > 0 && (
          <div className="text-center">
            <Button variant="link" onClick={handleStartProcessing}>
              View All Documents <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle>Start Processing Your Documents</CardTitle>
          <CardDescription>
            Upload your handwritten documents and let our AI extract structured data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Our AI-powered system can analyze handwritten forms, convert them to
            structured data, and help you organize information efficiently.
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={handleStartProcessing}>
            Get Started <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
