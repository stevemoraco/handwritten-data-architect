import * as React from "react";
import { Check, FileText, Loader2 } from "lucide-react";
import { useDocuments } from "@/context/DocumentContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Document } from "@/types";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

interface DocumentSelectorProps {
  onSelectionChange: (documentIds: string[]) => void;
  showTitle?: boolean;
  maxSelections?: number;
  preselectedIds?: string[];
  className?: string;
}

export function DocumentSelector({
  onSelectionChange,
  showTitle = true,
  maxSelections,
  preselectedIds = [],
  className
}: DocumentSelectorProps) {
  const { documents, isLoading, fetchUserDocuments } = useDocuments();
  const [selectedDocumentIds, setSelectedDocumentIds] = React.useState<string[]>(preselectedIds);
  const [filterStatus, setFilterStatus] = React.useState<string>("all");

  React.useEffect(() => {
    fetchUserDocuments();
  }, []);

  React.useEffect(() => {
    // Update selections when preselectedIds change
    if (preselectedIds.length > 0) {
      setSelectedDocumentIds(preselectedIds);
    }
  }, [preselectedIds]);
  
  // Calculate document counts by type/status
  const documentCounts = React.useMemo(() => {
    const typeCount: Record<string, number> = {};
    const statusCount: Record<string, number> = {
      all: documents.length,
      ready: 0,
      processed: 0,
      processing: 0,
      failed: 0,
    };
    
    documents.forEach(doc => {
      // Count by document type (pdf, image, etc)
      const type = doc.type || "unknown";
      typeCount[type] = (typeCount[type] || 0) + 1;
      
      // Count by status
      if (doc.status) {
        statusCount[doc.status] = (statusCount[doc.status] || 0) + 1;
      }
      
      // Special "ready" category for processed docs with thumbnails
      if (doc.status === "processed" && doc.thumbnails && doc.thumbnails.length > 0) {
        statusCount.ready = (statusCount.ready || 0) + 1;
      }
    });
    
    return { typeCount, statusCount };
  }, [documents]);

  const toggleDocumentSelection = (documentId: string) => {
    setSelectedDocumentIds(prev => {
      const isCurrentlySelected = prev.includes(documentId);
      
      // If already selected, remove it
      if (isCurrentlySelected) {
        const newSelection = prev.filter(id => id !== documentId);
        onSelectionChange(newSelection);
        return newSelection;
      }
      
      // Add the selection (no max limit now)
      const newSelection = [...prev, documentId];
      onSelectionChange(newSelection);
      return newSelection;
    });
  };

  const filteredDocuments = React.useMemo(() => {
    if (filterStatus === "all") {
      return documents;
    }
    
    return documents.filter(doc => {
      if (filterStatus === "ready") {
        return doc.status === "processed" && doc.thumbnails && doc.thumbnails.length > 0;
      }
      return doc.status === filterStatus;
    });
  }, [documents, filterStatus]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading documents...</span>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <p>No documents found.</p>
            <p>Please upload some documents first.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        {showTitle && (
          <h3 className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>Select Documents</span>
            <Badge variant="outline" className="ml-2">
              {selectedDocumentIds.length} selected
            </Badge>
          </h3>
        )}

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter documents" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Filter by status</SelectLabel>
              <SelectItem value="all">All documents ({documentCounts.statusCount.all})</SelectItem>
              <SelectItem value="ready">Ready to process ({documentCounts.statusCount.ready})</SelectItem>
              <SelectItem value="processed">Processed ({documentCounts.statusCount.processed})</SelectItem>
              <SelectItem value="processing">Processing ({documentCounts.statusCount.processing})</SelectItem>
              <SelectItem value="failed">Failed ({documentCounts.statusCount.failed})</SelectItem>
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Filter by type</SelectLabel>
              {Object.entries(documentCounts.typeCount).map(([type, count]) => (
                <SelectItem key={type} value={`type-${type}`}>
                  {type.toUpperCase()} ({count})
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="h-[320px] pr-3 -mr-3">
        <div className="space-y-2">
          {filteredDocuments.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              isSelected={selectedDocumentIds.includes(doc.id)}
              onSelect={() => toggleDocumentSelection(doc.id)}
              disabled={false} // Removing disabled state to allow any number of selections
            />
          ))}
          
          {filteredDocuments.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <p>No documents match the selected filter.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface DocumentCardProps {
  document: Document;
  isSelected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

function DocumentCard({ document, isSelected, onSelect, disabled }: DocumentCardProps) {
  // Determine if document is ready for processing
  const isReady = document.status === "processed" && 
                 document.thumbnails && 
                 document.thumbnails.length > 0;

  // Get status text and color
  const getStatusBadge = () => {
    switch (document.status) {
      case "processed":
        return isReady ? 
          <Badge variant="default" className="ml-2">Ready</Badge> : 
          <Badge variant="outline" className="ml-2">Processed</Badge>;
      case "processing":
        return <Badge variant="secondary" className="ml-2">Processing</Badge>;
      case "failed":
        return <Badge variant="destructive" className="ml-2">Failed</Badge>;
      default:
        return <Badge variant="outline" className="ml-2">{document.status}</Badge>;
    }
  };

  return (
    <Card 
      className={cn(
        "p-3 transition-colors",
        isSelected ? "border-primary bg-primary/5" : "",
        disabled ? "opacity-50" : "cursor-pointer hover:bg-accent/50",
      )}
      onClick={disabled ? undefined : onSelect}
    >
      <div className="flex items-center space-x-3">
        <Checkbox 
          checked={isSelected}
          onCheckedChange={() => !disabled && onSelect()}
          disabled={disabled}
          className={isSelected ? "data-[state=checked]:bg-primary" : ""}
        />
        
        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded border bg-muted">
          {document.thumbnails && document.thumbnails.length > 0 ? (
            <img 
              src={document.thumbnails[0]} 
              alt={document.name}
              className="h-full w-full object-cover"
              onError={(e) => {
                // Fallback for broken images
                (e.target as HTMLImageElement).src = 'https://placehold.co/100x100/f5f5f5/333333?text=No+Preview';
              }}
            />
          ) : (
            <FileText className="h-full w-full p-2 text-muted-foreground" />
          )}
        </div>
        
        <div className="flex-grow min-w-0">
          <div className="flex items-center">
            <p className="text-sm font-medium truncate">{document.name}</p>
            {getStatusBadge()}
          </div>
          <p className="text-xs text-muted-foreground">
            {document.pageCount 
              ? `${document.pageCount} pages` 
              : 'Unknown page count'}
            {isSelected && (
              <span className="ml-1 text-primary">
                <Check className="h-3 w-3 inline" />
              </span>
            )}
          </p>
        </div>
      </div>
      
      {document.status === "failed" && document.processing_error && (
        <p className="mt-2 text-xs text-destructive">{document.processing_error}</p>
      )}
    </Card>
  );
}
