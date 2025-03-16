
import * as React from "react";
import { useDocuments } from "@/context/DocumentContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Check, FileIcon, UploadIcon, ExternalLink, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export interface BatchDocumentsSelectorProps {
  onSelectionChange: (selectedIds: string[]) => void;
  selectedIds?: string[];
  maxSelections?: number;
  showTitle?: boolean;
  hideCheckboxes?: boolean;
  customHeader?: React.ReactNode;
  customActions?: React.ReactNode;
  renderExtraActions?: (doc: any) => React.ReactNode;
}

export function BatchDocumentsSelector({
  onSelectionChange,
  selectedIds: externalSelectedIds,
  maxSelections = 0,
  showTitle = true,
  hideCheckboxes = false,
  customHeader,
  customActions,
  renderExtraActions
}: BatchDocumentsSelectorProps) {
  const { documents, isLoading } = useDocuments();
  const [selectedIds, setSelectedIds] = React.useState<string[]>(externalSelectedIds || []);
  const [isControlledComponent] = React.useState(!!externalSelectedIds);

  React.useEffect(() => {
    if (isControlledComponent && externalSelectedIds) {
      setSelectedIds(externalSelectedIds);
    }
  }, [externalSelectedIds, isControlledComponent]);

  // Used for internal state management
  const handleSelectDocument = (documentId: string, checked: boolean) => {
    let newSelectedIds: string[];
    
    if (checked) {
      // If we have a max selection and we're at the limit, replace the oldest selection
      if (maxSelections > 0 && selectedIds.length >= maxSelections) {
        newSelectedIds = [...selectedIds.slice(1), documentId];
      } else {
        newSelectedIds = [...selectedIds, documentId];
      }
    } else {
      newSelectedIds = selectedIds.filter(id => id !== documentId);
    }
    
    setSelectedIds(newSelectedIds);
    onSelectionChange(newSelectedIds);
  };

  // Toggle all documents
  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      const allIds = documents.map(doc => doc.id);
      const newSelectedIds = maxSelections > 0 
        ? allIds.slice(0, maxSelections)
        : allIds;
      setSelectedIds(newSelectedIds);
      onSelectionChange(newSelectedIds);
    } else {
      setSelectedIds([]);
      onSelectionChange([]);
    }
  };

  const isDocumentSelected = (documentId: string) => {
    return selectedIds.includes(documentId);
  };

  const allSelected = documents.length > 0 && selectedIds.length === documents.length;
  const sortedDocuments = [...documents].sort((a, b) => {
    // First sort by selection status
    const aSelected = isDocumentSelected(a.id);
    const bSelected = isDocumentSelected(b.id);
    if (aSelected && !bSelected) return -1;
    if (!aSelected && bSelected) return 1;
    
    // Then by creation date (newest first)
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processed':
        return <Check className="h-3 w-3" />;
      case 'processing':
        return <Clock className="h-3 w-3" />;
      case 'failed':
        return <AlertTriangle className="h-3 w-3" />;
      default:
        return <UploadIcon className="h-3 w-3" />;
    }
  };

  return (
    <Card>
      {(showTitle || customHeader) && (
        <CardHeader className="pb-3">
          {customHeader || (
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileIcon className="h-5 w-5" />
                <span>Documents</span>
                <Badge variant="outline">
                  {selectedIds.length > 0 ? `${selectedIds.length} selected` : documents.length}
                </Badge>
              </div>
              {documents.length > 0 && !hideCheckboxes && (
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="select-all" 
                    checked={allSelected}
                    onCheckedChange={handleToggleAll} 
                  />
                  <label 
                    htmlFor="select-all" 
                    className="text-sm cursor-pointer"
                  >
                    {allSelected ? 'Deselect All' : 'Select All'}
                  </label>
                </div>
              )}
              {customActions}
            </CardTitle>
          )}
        </CardHeader>
      )}
      <CardContent className={cn(showTitle || customHeader ? "" : "pt-6")}>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="flex items-start gap-3">
                <Skeleton className="h-4 w-4 rounded-sm" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8">
            <FileIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No documents found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Upload documents to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedDocuments.map((document) => (
              <div 
                key={document.id} 
                className={cn(
                  "flex items-start gap-3 p-3 rounded-md",
                  isDocumentSelected(document.id)
                    ? "bg-primary/10"
                    : "hover:bg-muted/50 transition-colors"
                )}
              >
                {!hideCheckboxes && (
                  <Checkbox 
                    id={`doc-${document.id}`}
                    checked={isDocumentSelected(document.id)} 
                    onCheckedChange={(checked) => handleSelectDocument(document.id, !!checked)}
                    className="mt-1"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <label 
                      htmlFor={`doc-${document.id}`}
                      className={cn(
                        "font-medium text-sm cursor-pointer truncate",
                        hideCheckboxes && "cursor-default"
                      )}
                    >
                      {document.name}
                    </label>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge 
                        variant="outline"
                        className={cn(
                          "text-xs font-normal py-0 h-5 gap-1",
                          getStatusColor(document.status)
                        )}
                      >
                        {getStatusIcon(document.status)}
                        {document.status}
                      </Badge>
                      
                      {document.original_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          title="View original document"
                          onClick={() => window.open(document.original_url, '_blank')}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      
                      {/* Render custom action buttons if provided */}
                      {renderExtraActions && renderExtraActions(document)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <span>{document.type.toUpperCase()}</span>
                    <span className="h-1 w-1 rounded-full bg-muted-foreground/50"></span>
                    <span>{document.pageCount || 0} pages</span>
                    <span className="h-1 w-1 rounded-full bg-muted-foreground/50"></span>
                    <span>{document.createdAt ? formatDistanceToNow(new Date(document.createdAt), { addSuffix: true }) : 'Unknown date'}</span>
                  </div>
                  {document.status === 'failed' && document.processing_error && (
                    <div className="mt-1 text-xs text-destructive">
                      Error: {document.processing_error}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
