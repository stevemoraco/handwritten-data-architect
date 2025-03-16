
import * as React from "react";
import { Document, ProcessingLog } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, FileText, MessageSquare, Code, AlertTriangle } from "lucide-react";
import { PromptDisplay } from "./PromptDisplay";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";

interface DocumentDetailProps {
  document: Document;
  onProcess?: (documentId: string) => void;
  logs?: ProcessingLog[];
}

export function DocumentDetail({ document, onProcess, logs = [] }: DocumentDetailProps) {
  const [activeTab, setActiveTab] = React.useState("preview");
  const [isCheckingFile, setIsCheckingFile] = React.useState(false);

  const handleViewOriginal = async () => {
    try {
      setIsCheckingFile(true);
      
      // Extract the URL to use - logging it to help debug
      console.log("Document original_url:", document.original_url);
      console.log("Document url:", document.url);
      
      // Try to find a working URL - prioritize original_url
      let documentUrl = document.original_url;
      
      // Check if the URL is properly formatted - if not, fall back to url
      if (!documentUrl || !documentUrl.includes('document_files')) {
        console.log("Using document.url as fallback");
        documentUrl = document.url;
      }
      
      // Final check
      if (!documentUrl) {
        throw new Error("No valid document URL available");
      }
      
      console.log("Opening document URL:", documentUrl);
      window.open(documentUrl, "_blank");
    } catch (error) {
      console.error("Error opening document:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Could not open the original document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCheckingFile(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            {document.name}
            <div className="flex items-center space-x-2">
              {(document.original_url || document.url) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleViewOriginal}
                  disabled={isCheckingFile}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {isCheckingFile ? "Loading..." : "View Original"}
                </Button>
              )}
              {document.status !== "processed" && onProcess && (
                <Button size="sm" onClick={() => onProcess(document.id)}>
                  Process
                </Button>
              )}
              <Badge variant={document.status === "processed" ? "default" : "secondary"}>
                {document.status}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            <Badge>Uploaded</Badge> {new Date(document.createdAt || document.created_at!).toLocaleDateString()}
          </p>
          
          {document.processing_error && (
            <div className="mt-4 p-3 border border-destructive rounded-md bg-destructive/10">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Processing Error</p>
                  <p className="text-sm text-muted-foreground">{document.processing_error}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        {document.transcription && (
          <CardFooter className="justify-between">
            <div>
              Extracted{" "}
              {document.pageCount || document.page_count} pages
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
          {logs && logs.length > 0 && (
            <TabsTrigger value="logs">
              <Code className="h-4 w-4 mr-2" />
              Processing Logs
            </TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent>
              {document.thumbnails && document.thumbnails.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {document.thumbnails.map((thumbnail, index) => (
                    <div key={index} className="border rounded-lg overflow-hidden">
                      <img 
                        src={thumbnail} 
                        alt={`Page ${index + 1}`} 
                        className="w-full h-auto object-contain"
                        onError={(e) => {
                          console.log(`Thumbnail failed to load: ${thumbnail}`);
                          (e.target as HTMLImageElement).src = `/placeholder.svg`;
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8 flex flex-col items-center">
                  <p className="mb-4">No preview thumbnails available</p>
                  {(document.original_url || document.url) && (
                    <Button
                      variant="outline"
                      onClick={handleViewOriginal}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Original Document
                    </Button>
                  )}
                </div>
              )}
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
                <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                  <div className="prose prose-sm max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: document.transcription }} />
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-center text-muted-foreground py-8">No transcription available.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="prompts">
          <PromptDisplay documentId={document.id} />
        </TabsContent>

        {logs && logs.length > 0 && (
          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Processing Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {logs.map((log) => (
                    <div 
                      key={log.id}
                      className={`p-3 border rounded-md ${
                        log.status === "error" ? "border-destructive bg-destructive/10" : "border-border"
                      }`}
                    >
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">
                          {log.action}
                          <Badge className="ml-2" variant={log.status === "error" ? "destructive" : "outline"}>
                            {log.status}
                          </Badge>
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      {log.message && (
                        <p className="text-sm whitespace-pre-wrap">{log.message}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
