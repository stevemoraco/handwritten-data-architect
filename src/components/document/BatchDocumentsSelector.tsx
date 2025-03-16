
import * as React from "react";
import { Check, FileText, CalendarIcon, Ban, EyeIcon, FileTypeIcon, PlayIcon, TrashIcon, PlusIcon } from "lucide-react";
import { useDocuments } from "@/context/DocumentContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Document } from "@/types";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

interface BatchDocumentsSelectorProps {
  onSelectionChange?: (documentIds: string[]) => void;
  className?: string;
}

export function BatchDocumentsSelector({
  onSelectionChange,
  className
}: BatchDocumentsSelectorProps) {
  const { documents, isLoading, fetchUserDocuments, convertPdfToImages, processDocumentText } = useDocuments();
  const [selectedDocumentIds, setSelectedDocumentIds] = React.useState<string[]>([]);
  const [activeTab, setActiveTab] = React.useState<string>("all");
  const navigate = useNavigate();
  
  // Using a ref to prevent duplicate fetches
  const hasFetchedRef = React.useRef(false);

  React.useEffect(() => {
    if (!hasFetchedRef.current) {
      fetchUserDocuments();
      hasFetchedRef.current = true;
    }
  }, [fetchUserDocuments]);

  React.useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selectedDocumentIds);
    }
  }, [selectedDocumentIds, onSelectionChange]);

  const documentsByDate = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
    
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const grouped: Record<string, Document[]> = {
      'Today': [],
      'Yesterday': [],
      'This Week': [],
      'This Month': [],
      'Older': []
    };

    documents.forEach(doc => {
      const docDate = new Date(doc.createdAt);
      
      if (docDate >= today) {
        grouped['Today'].push(doc);
      } else if (docDate >= yesterday) {
        grouped['Yesterday'].push(doc);
      } else if (docDate >= thisWeekStart) {
        grouped['This Week'].push(doc);
      } else if (docDate >= thisMonthStart) {
        grouped['This Month'].push(doc);
      } else {
        grouped['Older'].push(doc);
      }
    });
    
    return grouped;
  }, [documents]);

  const documentsByPipeline = React.useMemo(() => {
    const grouped: Record<string, Document[]> = {
      'No Pipeline': []
    };

    documents.forEach(doc => {
      if (!doc.pipelineId) {
        grouped['No Pipeline'].push(doc);
      } else {
        const pipelineId = doc.pipelineId;
        if (!grouped[pipelineId]) {
          grouped[pipelineId] = [];
        }
        grouped[pipelineId].push(doc);
      }
    });
    
    return grouped;
  }, [documents]);

  const filteredDocuments = React.useMemo(() => {
    if (activeTab === "all") {
      return documents;
    } else if (activeTab === "noPipeline") {
      return documents.filter(doc => !doc.pipelineId);
    } else if (activeTab.startsWith("date-")) {
      const dateCategory = activeTab.replace("date-", "");
      return documentsByDate[dateCategory] || [];
    } else if (activeTab.startsWith("pipeline-")) {
      const pipelineId = activeTab.replace("pipeline-", "");
      return documents.filter(doc => doc.pipelineId === pipelineId);
    } else {
      return documents;
    }
  }, [activeTab, documents, documentsByDate]);

  const toggleDocumentSelection = (documentId: string) => {
    setSelectedDocumentIds(prev => {
      const isCurrentlySelected = prev.includes(documentId);
      
      if (isCurrentlySelected) {
        return prev.filter(id => id !== documentId);
      } else {
        return [...prev, documentId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedDocumentIds.length === filteredDocuments.length) {
      setSelectedDocumentIds([]);
    } else {
      setSelectedDocumentIds(filteredDocuments.map(doc => doc.id));
    }
  };

  const handleBulkAction = async (action: 'view' | 'convert' | 'process' | 'delete') => {
    if (selectedDocumentIds.length === 0) {
      toast({
        title: "No documents selected",
        description: "Please select at least one document to perform this action.",
        variant: "destructive"
      });
      return;
    }

    switch (action) {
      case 'view':
        if (selectedDocumentIds.length === 1) {
          navigate(`/document/${selectedDocumentIds[0]}`);
        } else {
          toast({
            title: "Multiple documents selected",
            description: "You can only view one document at a time. Please select a single document.",
            variant: "destructive"
          });
        }
        break;
        
      case 'convert':
        toast({
          title: "Converting documents",
          description: `Converting ${selectedDocumentIds.length} document(s) to images.`
        });
        
        for (const docId of selectedDocumentIds) {
          try {
            await convertPdfToImages(docId);
          } catch (error) {
            console.error(`Error converting document ${docId}:`, error);
          }
        }
        break;
        
      case 'process':
        navigate('/process', { state: { documentIds: selectedDocumentIds } });
        break;
        
      case 'delete':
        toast({
          title: "Delete not implemented",
          description: "Delete functionality is not yet implemented.",
          variant: "destructive"
        });
        break;
    }
  };

  const handleCreatePipeline = () => {
    if (selectedDocumentIds.length === 0) {
      toast({
        title: "No documents selected",
        description: "Please select at least one document to create a pipeline.",
        variant: "destructive"
      });
      return;
    }
    
    navigate('/process', { state: { documentIds: selectedDocumentIds } });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mr-2"></div>
        <p className="text-muted-foreground">Loading documents...</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-4 flex flex-wrap gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleSelectAll}
          className="flex items-center gap-1"
        >
          <Checkbox 
            checked={selectedDocumentIds.length > 0 && selectedDocumentIds.length === filteredDocuments.length}
            className="mr-1"
          />
          {selectedDocumentIds.length > 0 ? `Selected (${selectedDocumentIds.length})` : "Select All"}
        </Button>
        
        <Separator orientation="vertical" className="h-8" />
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => handleBulkAction('view')}
          disabled={selectedDocumentIds.length !== 1}
          className="flex items-center gap-1"
        >
          <EyeIcon className="h-4 w-4" /> View
        </Button>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => handleBulkAction('convert')}
          disabled={selectedDocumentIds.length === 0}
          className="flex items-center gap-1"
        >
          <FileTypeIcon className="h-4 w-4" /> Convert
        </Button>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => handleBulkAction('process')}
          disabled={selectedDocumentIds.length === 0}
          className="flex items-center gap-1"
        >
          <PlayIcon className="h-4 w-4" /> Process
        </Button>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => handleBulkAction('delete')}
          disabled={selectedDocumentIds.length === 0}
          className="flex items-center gap-1"
        >
          <TrashIcon className="h-4 w-4" /> Delete
        </Button>
        
        <div className="ml-auto">
          <Button 
            variant="default" 
            size="sm"
            onClick={handleCreatePipeline}
            disabled={selectedDocumentIds.length === 0}
            className="flex items-center gap-1"
          >
            <PlusIcon className="h-4 w-4" /> Process Documents To Create New Pipeline
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="mb-4 flex-wrap h-auto py-2">
          <TabsTrigger value="all" className="mb-1">All Documents</TabsTrigger>
          <TabsTrigger value="noPipeline" className="mb-1">
            <Ban className="h-4 w-4 mr-1" /> No Pipeline
          </TabsTrigger>
          
          <TabsTrigger value="date-header" disabled className="mb-1 font-bold">
            <CalendarIcon className="h-4 w-4 mr-1" /> By Date
          </TabsTrigger>
          {Object.entries(documentsByDate).map(([dateCategory, docs]) => 
            docs.length > 0 && (
              <TabsTrigger key={`date-${dateCategory}`} value={`date-${dateCategory}`} className="mb-1">
                {dateCategory} ({docs.length})
              </TabsTrigger>
            )
          )}
          
          {Object.entries(documentsByPipeline)
            .filter(([pipelineId, _]) => pipelineId !== 'No Pipeline')
            .map(([pipelineId, docs]) => (
              <TabsTrigger key={`pipeline-${pipelineId}`} value={`pipeline-${pipelineId}`} className="mb-1">
                <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6h12M6 12h12M6 18h12"></path>
                </svg>
                Pipeline {pipelineId.substring(0, 6)}... ({docs.length})
              </TabsTrigger>
            ))}
        </TabsList>
        
        <TabsContent value={activeTab} className="m-0">
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-muted/20">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No documents found</h3>
              <p className="text-muted-foreground mt-1">
                No documents match the selected filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredDocuments.map((document) => (
                <DocumentCard
                  key={document.id}
                  document={document}
                  isSelected={selectedDocumentIds.includes(document.id)}
                  onSelect={() => toggleDocumentSelection(document.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface DocumentCardProps {
  document: Document;
  isSelected: boolean;
  onSelect: () => void;
}

function DocumentCard({ document, isSelected, onSelect }: DocumentCardProps) {
  const isReady = document.status === "processed" && 
                 document.thumbnails && 
                 document.thumbnails.length > 0;

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

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (e) {
      return "Unknown date";
    }
  };

  return (
    <Card 
      className={cn(
        "transition-colors cursor-pointer hover:bg-accent/50",
        isSelected ? "border-primary bg-primary/5" : ""
      )}
      onClick={onSelect}
    >
      <CardHeader className="p-4 pb-0 flex flex-row items-start gap-2">
        <Checkbox 
          checked={isSelected}
          onCheckedChange={() => onSelect()}
          className={cn(
            "mt-1",
            isSelected ? "data-[state=checked]:bg-primary" : ""
          )}
        />
        
        <div className="flex-1 min-w-0">
          <CardTitle className="text-sm font-medium truncate">{document.name}</CardTitle>
          <div className="flex items-center mt-1">
            {getStatusBadge()}
            {document.pipelineId && (
              <Badge variant="outline" className="ml-2">Pipeline</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-3">
        <div className="flex items-center">
          <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded border bg-muted">
            {document.thumbnails && document.thumbnails.length > 0 ? (
              <img 
                src={document.thumbnails[0]} 
                alt={document.name}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://placehold.co/100x100/f5f5f5/333333?text=No+Preview';
                }}
              />
            ) : (
              <FileText className="h-full w-full p-2 text-muted-foreground" />
            )}
          </div>
          
          <div className="ml-3 flex-1">
            <div className="text-xs text-muted-foreground">
              {document.pageCount 
                ? `${document.pageCount} pages` 
                : 'Unknown page count'}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              <CalendarIcon className="h-3 w-3 inline-block mr-1" />
              {formatDate(document.createdAt)}
            </div>
          </div>
        </div>
        
        {document.status === "failed" && document.error && (
          <p className="mt-2 text-xs text-destructive">{document.error}</p>
        )}
      </CardContent>
    </Card>
  );
}
