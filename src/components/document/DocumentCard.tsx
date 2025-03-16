
import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Document } from "@/types";
import { 
  FileIcon, 
  FilePenIcon, 
  FileTextIcon, 
  RotateCw, 
  Trash2, 
  FileImage, 
  ExternalLink, 
  Eye, 
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useDocuments } from "@/context/DocumentContext";
import { toast } from "@/components/ui/use-toast";
import { Progress } from "@/components/ui/progress";

interface DocumentCardProps {
  document: Document;
  onView?: () => void;
  onProcess?: () => void;
  onDelete?: () => void;
  className?: string;
  isSelected?: boolean; 
  onToggleSelect?: () => void;
}

export function DocumentCard({
  document,
  onView,
  onProcess,
  onDelete,
  className,
  isSelected,
  onToggleSelect
}: DocumentCardProps) {
  const { convertPdfToImages, processDocumentText, removeDocument } = useDocuments();
  const [isConverting, setIsConverting] = React.useState(false);
  const [isProcessingText, setIsProcessingText] = React.useState(false);
  const [progress, setProgress] = React.useState(document.processing_progress || 0);
  const [conversionError, setConversionError] = React.useState<string | null>(document.processing_error || null);
  const [thumbnails, setThumbnails] = React.useState<string[]>(document.thumbnails || []);

  React.useEffect(() => {
    setProgress(document.processing_progress || 0);
    setConversionError(document.processing_error || null);
    
    if (document.thumbnails) {
      setThumbnails(document.thumbnails);
    }
    
    // If document status changes from processing to another state, reset our local states
    if (document.status !== "processing") {
      setIsConverting(false);
      setIsProcessingText(false);
    }
  }, [document.processing_progress, document.status, document.processing_error, document.thumbnails]);

  const getStatusColor = (status: Document["status"]) => {
    switch (status) {
      case "processing":
        return "bg-yellow-400 hover:bg-yellow-500";
      case "processed":
        return "bg-green-400 hover:bg-green-500";
      case "failed":
        return "bg-red-400 hover:bg-red-500";
      default:
        return "bg-blue-400 hover:bg-blue-500";
    }
  };

  const getStatusIcon = (status: Document["status"]) => {
    switch (status) {
      case "processing":
        return <RotateCw className="h-3 w-3 animate-spin" />;
      case "processed":
        return <FileTextIcon className="h-3 w-3" />;
      case "failed":
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <FileIcon className="h-3 w-3" />;
    }
  };

  const handleConvert = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsConverting(true);
    setConversionError(null);
    
    try {
      await convertPdfToImages(document.id);
      toast({
        title: "Conversion started",
        description: "PDF is being converted to images. This may take a moment.",
      });
    } catch (error) {
      setConversionError(error instanceof Error ? error.message : "An error occurred");
      toast({
        title: "Conversion failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
      setIsConverting(false);
    }
  };

  const handleProcessText = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsProcessingText(true);
    try {
      await processDocumentText(document.id);
      toast({
        title: "Text processing started",
        description: "Document text is being processed. This may take a moment.",
      });
    } catch (error) {
      toast({
        title: "Text processing failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessingText(false);
    }
  };

  const openOriginalDocument = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (document.url) {
      window.open(document.url, '_blank');
    } else {
      toast({
        title: "Error",
        description: "Original document URL not available",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      if (onDelete) {
        onDelete();
      } else {
        await removeDocument(document.id);
        toast({
          title: "Document deleted",
          description: "The document has been removed successfully",
        });
      }
    } catch (error) {
      toast({
        title: "Deletion failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const handleViewClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (onView) onView();
  };

  const handleProcessClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (onProcess) onProcess();
  };

  const handleCardClick = () => {
    if (onToggleSelect) {
      onToggleSelect();
    }
  };

  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all hover:shadow-md cursor-pointer relative", 
        isSelected && "ring-2 ring-primary",
        className
      )}
      onClick={handleCardClick}
    >
      {isSelected && (
        <div className="absolute right-2 top-2 h-4 w-4 rounded-full bg-primary z-10"></div>
      )}
      
      <CardHeader className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base line-clamp-1">{document.name}</CardTitle>
            <CardDescription className="text-xs">
              {new Date(document.createdAt).toLocaleDateString()}
            </CardDescription>
          </div>
          <Badge className={cn("pill", getStatusColor(document.status))}>
            <span className="flex items-center gap-1">
              {getStatusIcon(document.status)}
              {document.status}
            </span>
          </Badge>
        </div>
      </CardHeader>
      
      {(document.status === "processing" || isConverting) && (
        <CardContent className="px-4 pb-0 pt-0">
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Processing...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-1" />
          </div>
        </CardContent>
      )}
      
      {conversionError && (
        <CardContent className="px-4 pb-0 pt-0 bg-destructive/10 rounded mx-2">
          <div className="text-xs text-destructive p-2">
            <p className="font-medium">Conversion failed</p>
            <p className="break-words">{conversionError}</p>
          </div>
        </CardContent>
      )}
      
      {thumbnails && thumbnails.length > 0 ? (
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <div className="flex p-4 gap-3">
              {thumbnails.map((url, index) => (
                <div
                  key={index}
                  className="relative w-20 h-24 flex-shrink-0 overflow-hidden rounded border"
                >
                  <img
                    src={url}
                    alt={`Page ${index + 1}`}
                    className="h-full w-full object-cover transition-transform"
                    onError={(e) => {
                      console.log(`Image failed to load: ${url}`);
                      // Fallback for broken images
                      (e.target as HTMLImageElement).src = `https://placehold.co/160x192/f5f5f5/333333?text=Page+${index+1}`;
                    }}
                  />
                  <div className="absolute inset-0 bg-black/5 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Badge variant="secondary" className="text-[0.65rem]">
                      Page {index + 1}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      ) : (
        <CardContent className="p-4 text-center text-muted-foreground">
          <FileIcon className="h-10 w-10 mx-auto mb-2 opacity-20" />
          <p className="text-sm">No preview available</p>
        </CardContent>
      )}
      
      {document.processing_error && !conversionError && (
        <CardContent className="px-4 pb-0 pt-0">
          <div className="text-xs text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">
            <p className="font-medium">Error:</p>
            <p className="break-words">{document.processing_error}</p>
          </div>
        </CardContent>
      )}
      
      <Separator className="mt-4" />
      
      <CardFooter className="p-3 flex gap-2 flex-wrap text-xs">
        {/* View button */}
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          onClick={handleViewClick}
        >
          <Eye className="h-3 w-3 mr-1" /> View
        </Button>
        
        {/* Retry/Convert button */}
        <Button
          size="sm"
          variant={document.status === "failed" ? "destructive" : "outline"}
          className="h-8 text-xs"
          onClick={handleConvert}
          disabled={document.status === "processing"}
        >
          {isConverting || document.status === "processing" ? (
            <>
              <RotateCw className="h-3 w-3 mr-1 animate-spin" />
              Converting...
            </>
          ) : document.status === "failed" ? (
            <>
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </>
          ) : thumbnails && thumbnails.length > 0 ? (
            <>
              <RotateCw className="h-3 w-3 mr-1" />
              Reconvert
            </>
          ) : (
            <>
              <FileImage className="h-3 w-3 mr-1" />
              Convert
            </>
          )}
        </Button>
        
        {/* Text processing button */}
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          onClick={handleProcessText}
          disabled={isProcessingText || document.status === "processing" || (!thumbnails || thumbnails.length === 0)}
        >
          {isProcessingText ? (
            <>
              <RotateCw className="h-3 w-3 mr-1 animate-spin" />
              Processing...
            </>
          ) : document.transcription ? (
            <>
              <RotateCw className="h-3 w-3 mr-1" />
              Reprocess
            </>
          ) : (
            <>
              <FileTextIcon className="h-3 w-3 mr-1" />
              Process
            </>
          )}
        </Button>
        
        {/* Process in pipeline button */}
        {document.status === "processed" && onProcess && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={handleProcessClick}
          >
            <FileImage className="h-3 w-3 mr-1" />
            Process
          </Button>
        )}
        
        {/* View original document button */}
        {document.url && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={openOriginalDocument}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            View Original
          </Button>
        )}
        
        {/* Delete button */}
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs ml-auto text-destructive hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20"
          onClick={handleDelete}
          disabled={document.status === "processing"}
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
}
