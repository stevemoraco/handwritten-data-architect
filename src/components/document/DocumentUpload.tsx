
import * as React from "react";
import { FileUpload } from "@/components/ui/file-upload";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUpload } from "@/context/UploadContext";
import { useAuth } from "@/context/AuthContext";
import { useDocuments } from "@/context/DocumentContext";
import { toast } from "@/components/ui/use-toast";
import { ArrowRight, FileText, Shield, AlertTriangle, RefreshCw, ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { LoginModal } from "@/components/auth/LoginModal";
import { Document } from "@/types";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface DocumentUploadProps {
  onDocumentsUploaded?: (documentIds: string[]) => void;
  pipelineId?: string;
  className?: string;
}

export function DocumentUpload({
  onDocumentsUploaded,
  pipelineId,
  className,
}: DocumentUploadProps) {
  const { isUploading, uploads, addUpload, updateUploadProgress, updateUploadStatus, updatePageProgress } = useUpload();
  const { user } = useAuth();
  const { documents, isLoading, fetchUserDocuments, convertPdfToImages, processDocumentText } = useDocuments();
  const navigate = useNavigate();
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [uploadedDocumentIds, setUploadedDocumentIds] = React.useState<string[]>([]);
  const [showLoginModal, setShowLoginModal] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (user) {
      fetchUserDocuments();
    }
  }, [user]);

  const handleFilesSelected = (files: File[]) => {
    if (!user) {
      setSelectedFiles(files);
      setShowLoginModal(true);
      return;
    }
    
    setSelectedFiles(files);
    startUpload(files);
  };
  
  const startUpload = async (files: File[]) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    
    setError(null);
    
    try {
      const newDocumentIds = await Promise.all(
        files.map(async (file) => {
          const uploadId = addUpload(file.name);
          
          try {
            const { data: document, error: documentError } = await supabase
              .from('documents')
              .insert({
                name: file.name,
                type: file.type.includes('pdf') ? 'pdf' : 'image',
                status: 'uploading',
                user_id: user.id,
                size: file.size
              })
              .select()
              .single();
            
            if (documentError) {
              throw new Error(`Failed to create document record: ${documentError.message}`);
            }
            
            if (!document) {
              throw new Error('Document record not created');
            }
            
            await supabase.from('processing_logs').insert({
              document_id: document.id,
              action: 'Upload Started',
              status: 'success',
              message: `Started uploading ${file.name}`
            });
            
            console.log(`Created document record with ID: ${document.id}`);
            
            const filePath = `${user.id}/${document.id}/${encodeURIComponent(file.name)}`;
            
            const uploadOptions = {
              cacheControl: '3600'
            };
            
            let lastProgress = 0;
            
            const xhr = new XMLHttpRequest();
            const uploadPromise = new Promise<void>((resolve, reject) => {
              xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                  const percent = Math.round((event.loaded / event.total) * 100);
                  if (percent > lastProgress) {
                    lastProgress = percent;
                    updateUploadProgress(uploadId, percent);
                    console.log(`Upload progress for ${file.name}: ${percent}%`);
                  }
                }
              });
              
              xhr.addEventListener('error', () => {
                reject(new Error('XHR error occurred during upload'));
              });
              
              xhr.addEventListener('abort', () => {
                reject(new Error('Upload aborted'));
              });
              
              xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                  resolve();
                } else {
                  reject(new Error(`HTTP error ${xhr.status}: ${xhr.statusText}`));
                }
              });
            });
            
            const { error: uploadError } = await supabase.storage
              .from('document_files')
              .upload(filePath, file, uploadOptions);
            
            if (uploadError) {
              await supabase
                .from('documents')
                .update({
                  status: 'failed',
                  processing_error: uploadError.message,
                  updated_at: new Date().toISOString()
                })
                .eq('id', document.id);
              
              await supabase.from('processing_logs').insert({
                document_id: document.id,
                action: 'Upload Failed',
                status: 'error',
                message: uploadError.message
              });
              
              updateUploadStatus(uploadId, 'error', uploadError.message);
              throw new Error(`Failed to upload file: ${uploadError.message}`);
            }
            
            const { data: publicURL } = supabase.storage
              .from('document_files')
              .getPublicUrl(filePath);
            
            await supabase
              .from('documents')
              .update({
                status: 'uploaded',
                original_url: publicURL.publicUrl,
                updated_at: new Date().toISOString()
              })
              .eq('id', document.id);
            
            await supabase.from('processing_logs').insert({
              document_id: document.id,
              action: 'Upload Completed',
              status: 'success',
              message: `Successfully uploaded ${file.name}`
            });
            
            updateUploadStatus(uploadId, 'complete');
            console.log(`File uploaded successfully: ${file.name}`);
            
            try {
              updateUploadStatus(uploadId, 'processing');
              setIsProcessing(true);
              
              const estimatedPageCount = Math.max(1, Math.ceil(file.size / 100000));
              updatePageProgress(uploadId, 0, estimatedPageCount);
              
              // Directly call the PDF to images conversion function
              const { data: processingResult, error: processingError } = await supabase.functions
                .invoke('pdf-to-images', {
                  body: { documentId: document.id, userId: user.id }
                });
              
              if (processingError) {
                console.error("Processing error from edge function:", processingError);
                throw new Error(`Document processing failed: ${processingError.message}`);
              }
              
              console.log('Processing result:', processingResult);
              
              if (processingResult && processingResult.pageCount) {
                updatePageProgress(uploadId, processingResult.pageCount, processingResult.pageCount);
              }
              
              updateUploadStatus(uploadId, 'complete');
              setIsProcessing(false);
              
              // Refresh the documents list to show the newly processed document
              await fetchUserDocuments();
            } catch (processingError) {
              console.error('Error processing document:', processingError);
              setIsProcessing(false);
              
              await supabase.from('processing_logs').insert({
                document_id: document.id,
                action: 'Processing Error',
                status: 'error',
                message: processingError.message || 'Unknown processing error'
              });
              
              updateUploadStatus(uploadId, 'error', processingError.message || 'Unknown processing error');
            }
            
            return document.id;
          } catch (error) {
            console.error(`Error uploading ${file.name}:`, error);
            updateUploadStatus(uploadId, 'error', error.message || 'Unknown error occurred');
            throw error;
          }
        })
      ).catch(error => {
        console.error('Error in upload process:', error);
        setError(`Upload failed: ${error.message}`);
        return [];
      });
      
      const successfulUploads = newDocumentIds.filter(id => id);
      
      if (successfulUploads.length > 0) {
        setUploadedDocumentIds(prev => [...prev, ...successfulUploads]);
        
        toast({
          title: "Files uploaded successfully",
          description: `${successfulUploads.length} document${successfulUploads.length > 1 ? 's' : ''} uploaded.`,
        });
        
        // Refresh documents list
        await fetchUserDocuments();
      }
    } catch (error) {
      console.error('Unexpected error in file upload handler:', error);
      setError(`An unexpected error occurred: ${error.message}`);
    }
  };

  const handleRetryProcessing = async (documentId: string) => {
    try {
      await convertPdfToImages(documentId);
    } catch (error) {
      console.error("Error retrying processing:", error);
      setError(`Failed to process document: ${error.message}`);
    }
  };

  const handleProcessText = async (documentId: string) => {
    try {
      await processDocumentText(documentId);
    } catch (error) {
      console.error("Error processing document text:", error);
      setError(`Failed to process document text: ${error.message}`);
    }
  };

  const handleViewOriginalDocument = (url: string) => {
    if (url) {
      window.open(url, '_blank');
    } else {
      toast({
        title: "Error",
        description: "Original document URL not available",
        variant: "destructive",
      });
    }
  };

  const handleContinue = () => {
    if (onDocumentsUploaded && uploadedDocumentIds.length > 0) {
      onDocumentsUploaded(uploadedDocumentIds);
    } else if (uploadedDocumentIds.length > 0) {
      navigate(`/process`);
    }
  };

  const handleViewDocument = (documentId: string) => {
    navigate(`/process?documentId=${documentId}`);
  };

  const handleAuthComplete = () => {
    setShowLoginModal(false);
    toast({
      title: "Account created successfully",
      description: "You can now securely upload and process your documents.",
    });
    
    if (selectedFiles.length > 0) {
      startUpload(selectedFiles);
    }
  };

  const successfulUploads = uploads.filter(upload => upload.status === "complete").length;
  const totalDocuments = documents.length;

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Upload Documents
            </div>
            {totalDocuments > 0 && (
              <Badge variant="outline" className="ml-2">
                {totalDocuments} document{totalDocuments !== 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          {!user && (
            <Alert className="mb-4 border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
              <Shield className="h-4 w-4" />
              <AlertTitle>Secure document handling</AlertTitle>
              <AlertDescription className="mt-2">
                <p className="mb-2">
                  To upload and process your documents securely, you'll need to create an account or sign in.
                  Your account ensures that:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Your documents remain private and secure</li>
                  <li>You can access your processed documents later</li>
                  <li>Your processing history is saved for future reference</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert className="mb-4 border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Upload Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <FileUpload
            onFilesUploaded={handleFilesSelected}
            accept={{ 'application/pdf': ['.pdf'] }}
            disabled={isUploading || isProcessing}
          />
          
          {isProcessing && (
            <div className="mt-4 text-center py-2 text-sm text-muted-foreground animate-pulse">
              Processing documents... This might take a moment.
            </div>
          )}
          
          {/* Previously uploaded documents */}
          {user && documents.length > 0 && (
            <div className="mt-6">
              <Separator className="my-4" />
              <h3 className="text-sm font-medium mb-2 flex justify-between items-center">
                <span>Your Documents</span>
                <Badge variant="outline">{documents.length} total</Badge>
              </h3>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {documents.map((doc) => (
                  <Card key={doc.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-grow min-w-0">
                        <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded border bg-muted">
                          {doc.thumbnails && doc.thumbnails.length > 0 ? (
                            <img 
                              src={doc.thumbnails[0]} 
                              alt={doc.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <FileText className="h-full w-full p-2 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-grow min-w-0">
                          <p className="text-sm font-medium truncate">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.pageCount ? `${doc.pageCount} pages` : 'Uploading...'}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {/* Original PDF view button */}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewOriginalDocument(doc.url)}
                          title="View original PDF"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                        
                        {/* Retry conversion button */}
                        {(doc.status === "failed" || !doc.thumbnails || doc.thumbnails.length === 0) && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleRetryProcessing(doc.id)}
                            title="Retry conversion"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        
                        {/* Process text button */}
                        {doc.thumbnails && doc.thumbnails.length > 0 && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleProcessText(doc.id)}
                            title="Process document text"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        
                        {/* View details button */}
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => handleViewDocument(doc.id)}
                        >
                          View
                        </Button>
                      </div>
                    </div>
                    
                    {/* Status indicator */}
                    {doc.status === "processing" && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs">
                          <span>Processing...</span>
                          <span>{Math.round(doc.processing_progress || 0)}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                          <div 
                            className="bg-primary h-1.5 rounded-full transition-all duration-300" 
                            style={{ width: `${doc.processing_progress || 0}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    
                    {/* Error message */}
                    {doc.status === "failed" && doc.error && (
                      <p className="mt-2 text-xs text-red-500">{doc.error}</p>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between border-t pt-4">
          <div className="text-sm text-muted-foreground">
            {successfulUploads > 0 ? (
              <span>{successfulUploads} document{successfulUploads > 1 ? 's' : ''} uploaded</span>
            ) : totalDocuments > 0 ? (
              <span>{totalDocuments} document{totalDocuments !== 1 ? 's' : ''} available</span>
            ) : (
              <span>Upload PDF documents to continue</span>
            )}
          </div>
          
          <Button 
            onClick={handleContinue}
            disabled={(uploads.length === 0 && documents.length === 0) || isUploading || isProcessing}
          >
            Continue <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>

      <LoginModal 
        open={showLoginModal} 
        onOpenChange={setShowLoginModal} 
        onComplete={handleAuthComplete} 
      />
    </>
  );
}
