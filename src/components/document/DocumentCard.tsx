
import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Document } from "@/types";
import { FileIcon, FilePenIcon, FileTextIcon, RotateCw, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useDocuments } from "@/context/DocumentContext";
import { toast } from "@/components/ui/use-toast";

interface DocumentCardProps {
  document: Document;
  onView?: () => void;
  onProcess?: () => void;
  onDelete?: () => void;
  className?: string;
}

export function DocumentCard({
  document,
  onView,
  onProcess,
  onDelete,
  className,
}: DocumentCardProps) {
  const { convertPdfToImages } = useDocuments();
  const [isConverting, setIsConverting] = React.useState(false);

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
        return <FilePenIcon className="h-3 w-3" />;
      default:
        return <FileIcon className="h-3 w-3" />;
    }
  };

  const handleConvert = async () => {
    if (!document.thumbnails && document.status !== "processing") {
      setIsConverting(true);
      try {
        await convertPdfToImages(document.id);
        toast({
          title: "Conversion complete",
          description: "Document has been converted to images successfully.",
        });
      } catch (error) {
        toast({
          title: "Conversion failed",
          description: error instanceof Error ? error.message : "An error occurred",
          variant: "destructive",
        });
      } finally {
        setIsConverting(false);
      }
    }
  };

  return (
    <Card className={cn("overflow-hidden transition-all hover-lift", className)}>
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
      
      {document.thumbnails && document.thumbnails.length > 0 && (
        <CardContent className="p-0">
          <ScrollArea orientation="horizontal" className="w-full">
            <div className="flex p-4 gap-3">
              {document.thumbnails.map((url, index) => (
                <div
                  key={index}
                  className="relative w-20 h-24 flex-shrink-0 overflow-hidden rounded border"
                >
                  <img
                    src={url}
                    alt={`Page ${index + 1}`}
                    className="h-full w-full object-cover transition-transform"
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
      )}
      
      <Separator />
      
      <CardFooter className="p-3 flex gap-2 flex-wrap text-xs">
        {!document.thumbnails && document.status !== "processing" && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={handleConvert}
            disabled={isConverting}
          >
            {isConverting ? (
              <>
                <RotateCw className="h-3 w-3 mr-1 animate-spin" />
                Converting...
              </>
            ) : (
              "Convert to Images"
            )}
          </Button>
        )}
        
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          onClick={onView}
        >
          View Details
        </Button>
        
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          onClick={onProcess}
        >
          Process
        </Button>
        
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs ml-auto text-destructive hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20"
          onClick={onDelete}
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
}
