
import * as React from "react";
import { Document, ProcessingLog } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, FileText, MessageSquare, Code, AlertTriangle, Loader2 } from "lucide-react";
import { PromptDisplay } from "./PromptDisplay";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface DocumentDetailProps {
  document: Document;
  onProcess?: (documentId: string) => void;
  logs?: ProcessingLog[];
}

export function DocumentDetail({ document, onProcess, logs = [] }: DocumentDetailProps) {
  const [isCheckingFile, setIsCheckingFile] = React.useState(false);
  const [fileUrl, setFileUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (document) {
      fetchDocumentUrl();
    }
  }, [document]);

  const fetchDocumentUrl = async () => {
    try {
      setIsCheckingFile(true);
      
      // First try using original_url if available
      if (document.original_url) {
        console.log("Using original_url:", document.original_url);
        setFileUrl(document.original_url);
        setIsCheckingFile(false);
        return;
      }
      
      // If not available, try direct storage path
      if (document.userId) {
        // Try with ID-based path first
        const pathWithId = `${document.userId}/${document.id}/original${document.type === 'pdf' ? '.pdf' : ''}`;
        console.log("Trying ID-based path:", pathWithId);
        
        const { data: urlWithId } = supabase.storage
          .from("document_files")
          .getPublicUrl(pathWithId);
          
        if (urlWithId?.publicUrl) {
          console.log("Found URL with ID-based path:", urlWithId.publicUrl);
          setFileUrl(urlWithId.publicUrl);
          setIsCheckingFile(false);
          return;
        }
        
        // Try with uploads path as fallback
        const filename = encodeURIComponent(document.name);
        const pathWithName = `${document.userId}/uploads/${filename}`;
        console.log("Trying name-based path:", pathWithName);
        
        const { data: urlWithName } = supabase.storage
          .from("document_files")
          .getPublicUrl(pathWithName);
          
        if (urlWithName?.publicUrl) {
          console.log("Found URL with name-based path:", urlWithName.publicUrl);
          setFileUrl(urlWithName.publicUrl);
          setIsCheckingFile(false);
          return;
        }
      }
      
      console.error("Could not find a valid URL for document:", document.id);
    } catch (error) {
      console.error("Error fetching document URL:", error);
    } finally {
      setIsCheckingFile(false);
    }
  };

  const handleViewOriginal = async () => {
    try {
      setIsCheckingFile(true);
      
      // If fileUrl is already set, try to use it first
      if (fileUrl) {
        console.log("Opening existing URL:", fileUrl);
        window.open(fileUrl, "_blank");
        setIsCheckingFile(false);
        return;
      }
      
      // If not, try to fetch it again
      await fetchDocumentUrl();
      
      if (fileUrl) {
        console.log("Opening newly fetched URL:", fileUrl);
        window.open(fileUrl, "_blank");
      } else {
        // Try one more approach - direct URL construction
        if (document.userId) {
          const directUrl = `https://fhlczpkjthsmhcbphryd.supabase.co/storage/v1/object/public/document_files/${document.userId}/uploads/${encodeURIComponent(document.name)}`;
          console.log("Trying direct URL construction:", directUrl);
          
          window.open(directUrl, "_blank");
        } else {
          throw new Error("Could not retrieve a valid document URL");
        }
      }
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

  // Helper function to safely check if thumbnails array exists and has items
  const hasThumbnails = () => {
    return Array.isArray(document.thumbnails) && document.thumbnails.length > 0 && document.thumbnails[0] !== null;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            {document.name}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewOriginal}
                disabled={isCheckingFile}
              >
                {isCheckingFile ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Original
                  </>
                )}
              </Button>
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
          <div className="flex items-center gap-2">
            <Badge variant="outline">Uploaded</Badge>
            <span>{new Date(document.createdAt || document.created_at!).toLocaleDateString()}</span>
          </div>
          
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
              {hasThumbnails() ? (
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
                  <Button
                    variant="outline"
                    onClick={handleViewOriginal}
                    disabled={isCheckingFile}
                  >
                    {isCheckingFile ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Original Document
                      </>
                    )}
                  </Button>
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
