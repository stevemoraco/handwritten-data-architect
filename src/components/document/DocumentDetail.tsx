import * as React from "react";
import { Document } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, FileText, MessageSquare, Code } from "lucide-react";
import { PromptDisplay } from "./PromptDisplay"; // Import the new PromptDisplay component

interface DocumentDetailProps {
  document: Document;
  onProcess?: (documentId: string) => void;
}

export function DocumentDetail({ document, onProcess }: DocumentDetailProps) {
  const [activeTab, setActiveTab] = React.useState("preview");

  const handleViewOriginal = (url: string) => {
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            {document.name}
            <div className="flex items-center space-x-2">
              {document.original_url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewOriginal(document.original_url)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Original
                </Button>
              )}
              {document.status !== "processed" && onProcess && (
                <Button size="sm" onClick={() => onProcess(document.id)}>
                  Process
                </Button>
              )}
              <Badge variant={document.status === "processed" ? "success" : "secondary"}>
                {document.status}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            <Badge>Uploaded</Badge> {new Date(document.created_at).toLocaleDateString()}
          </p>
        </CardContent>
        {document.transcription && (
          <CardFooter className="justify-between">
            <div>
              Extracted{" "}
              {document.page_count} pages
            </div>
          </CardFooter>
        )}
      </Card>
      
      <Tabs defaultValue="preview">
        <TabsList>
          <TabsTrigger value="preview">
            <FileText className="h-4 w-4 mr-2" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="transcription">
            <FileText className="h-4 w-4 mr-2" />
            Transcription
          </TabsTrigger>
          <TabsTrigger value="prompts">
            <MessageSquare className="h-4 w-4 mr-2" />
            AI Prompts
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Preview content here...</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="transcription">
          <Card>
            <CardHeader>
              <CardTitle>Transcription</CardTitle>
            </CardHeader>
            <CardContent>
              {document.transcription ? (
                <p>{document.transcription}</p>
              ) : (
                <p>No transcription available.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="prompts">
          <PromptDisplay documentId={document.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
