
import * as React from "react";
import { Document, ProcessingLog } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Download, FileText, Images, List, RotateCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useDocuments } from "@/context/DocumentContext";
import { toast } from "@/components/ui/use-toast";
import { getProcessingLogs } from "@/services/documentService";

interface DocumentDetailProps {
  document: Document;
  logs: ProcessingLog[];
}

export function DocumentDetail({ document, logs }: DocumentDetailProps) {
  const { processDocumentText, convertPdfToImages } = useDocuments();
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [processingLogs, setProcessingLogs] = React.useState<ProcessingLog[]>(logs || []);
  const [activeTab, setActiveTab] = React.useState("preview");

  React.useEffect(() => {
    if (logs) {
      setProcessingLogs(logs);
    } else {
      fetchLogs();
    }
  }, [document.id]);

  const fetchLogs = async () => {
    try {
      const logs = await getProcessingLogs(document.id);
      setProcessingLogs(logs);
    } catch (error) {
      console.error("Error fetching logs:", error);
    }
  };

  const handleTranscribe = async () => {
    if (!document.transcription) {
      setIsProcessing(true);
      try {
        await processDocumentText(document.id);
        toast({
          title: "Transcription complete",
          description: "Document has been transcribed successfully.",
        });
        await fetchLogs();
      } catch (error) {
        toast({
          title: "Transcription failed",
          description: error instanceof Error ? error.message : "An error occurred",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleReprocess = async () => {
    setIsProcessing(true);
    try {
      await convertPdfToImages(document.id);
      toast({
        title: "Processing started",
        description: "Document is being reprocessed. This may take a moment.",
      });
      await fetchLogs();
    } catch (error) {
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadOriginal = () => {
    if (document.url) {
      window.open(document.url, '_blank');
    } else {
      toast({
        title: "Download failed",
        description: "Original document URL is not available",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center justify-between">
          <span>Document Details</span>
          <div className="flex gap-2">
            {document.type === "pdf" && (
              <Button
                variant="outline"
                onClick={handleReprocess}
                disabled={isProcessing}
                className="gap-1"
              >
                <RotateCw className="h-4 w-4" />
                Reprocess
              </Button>
            )}
            {!document.transcription && (
              <Button
                onClick={handleTranscribe}
                disabled={isProcessing}
                className="gap-1"
              >
                <FileText className="h-4 w-4" />
                {isProcessing ? "Processing..." : "Generate Transcription"}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleDownloadOriginal}
              className="gap-1"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-2">
          <Badge variant="outline">{document.type.toUpperCase()}</Badge>
          <Badge 
            variant={
              document.status === "processed" ? "default" :
              document.status === "processing" ? "secondary" :
              document.status === "failed" ? "destructive" : "outline"
            }
          >
            {document.status.charAt(0).toUpperCase() + document.status.slice(1)}
          </Badge>
          {document.pageCount > 0 && (
            <Badge variant="outline">{document.pageCount} pages</Badge>
          )}
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="preview">
              <Images className="h-4 w-4 mr-2" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="transcription">
              <FileText className="h-4 w-4 mr-2" />
              Transcription
            </TabsTrigger>
            <TabsTrigger value="logs">
              <List className="h-4 w-4 mr-2" />
              Logs
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="preview" className="mt-0">
            {document.thumbnails && document.thumbnails.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                {document.thumbnails.map((url, index) => (
                  <div
                    key={index}
                    className="aspect-[3/4] relative overflow-hidden rounded-md border"
                  >
                    <img
                      src={url}
                      alt={`Page ${index + 1}`}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        // Fallback for broken images
                        (e.target as HTMLImageElement).src = `https://placehold.co/800x1100/f5f5f5/333333?text=Page+${index + 1}`;
                      }}
                    />
                    <div className="absolute top-2 right-2">
                      <Badge>Page {index + 1}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center bg-muted/20 rounded-md">
                <p className="text-muted-foreground">
                  {document.status === "processing" ? (
                    "Document is currently being processed. Please wait..."
                  ) : document.status === "failed" ? (
                    "Processing failed. Please try reprocessing the document."
                  ) : (
                    "No preview images available. Please convert the document first."
                  )}
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="transcription" className="mt-0">
            {document.transcription ? (
              <div className="bg-muted/20 rounded-md p-4 mt-4">
                <ScrollArea className="h-[500px] w-full pr-4">
                  <div className="whitespace-pre-wrap font-mono text-sm">
                    {document.transcription}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="py-12 text-center bg-muted/20 rounded-md">
                <p className="text-muted-foreground">
                  {isProcessing ? (
                    "Generating transcription... Please wait."
                  ) : (
                    "No transcription available. Please generate a transcription first."
                  )}
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="logs" className="mt-0">
            <div className="bg-muted/20 rounded-md mt-4">
              <ScrollArea className="h-[500px] w-full">
                {processingLogs.length > 0 ? (
                  <div className="space-y-3 p-4">
                    {processingLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 p-3 rounded-md bg-background"
                      >
                        <Badge
                          variant={
                            log.status === "success"
                              ? "default"
                              : log.status === "warning"
                              ? "outline"
                              : "destructive"
                          }
                          className="mt-0.5"
                        >
                          {log.status}
                        </Badge>
                        <div className="flex-1 space-y-1">
                          <div className="font-medium">{log.action}</div>
                          <p className="text-sm text-muted-foreground">
                            {log.message}
                          </p>
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <p className="text-muted-foreground">No logs available.</p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
