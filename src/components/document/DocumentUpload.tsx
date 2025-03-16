import * as React from "react";
import { FileUpload } from "@/components/ui/file-upload";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUpload } from "@/context/UploadContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { ArrowRight, FileText, Shield, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { LoginModal } from "@/components/auth/LoginModal";

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
  const navigate = useNavigate();
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [uploadedDocumentIds, setUploadedDocumentIds] = React.useState<string[]>([]);
  const [showLoginModal, setShowLoginModal] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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
                type: file.type,
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
            
            const filePath = `${user.id}/${document.id}/${file.name}`;
            
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
              
              const { data: processingResult, error: processingError } = await supabase.functions
                .invoke('process-document', {
                  body: { documentId: document.id }
                });
              
              if (processingError) {
                throw new Error(`Document processing failed: ${processingError.message}`);
              }
              
              console.log('Processing result:', processingResult);
              
              if (processingResult && processingResult.pageCount) {
                updatePageProgress(uploadId, processingResult.pageCount, processingResult.pageCount);
              }
              
              updateUploadStatus(uploadId, 'complete');
              setIsProcessing(false);
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
          description: `${successfulUploads.length} document${successfulUploads.length > 1 ? 's' : ''} uploaded and processed.`,
        });
      }
    } catch (error) {
      console.error('Unexpected error in file upload handler:', error);
      setError(`An unexpected error occurred: ${error.message}`);
    }
  };

  const handleContinue = () => {
    if (onDocumentsUploaded && uploadedDocumentIds.length > 0) {
      onDocumentsUploaded(uploadedDocumentIds);
    } else if (uploadedDocumentIds.length > 0) {
      navigate(`/document/${uploadedDocumentIds[0]}`);
    }
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

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Upload Documents
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
        </CardContent>
        
        <CardFooter className="flex justify-between border-t pt-4">
          <div className="text-sm text-muted-foreground">
            {successfulUploads > 0 ? (
              <span>{successfulUploads} document{successfulUploads > 1 ? 's' : ''} uploaded</span>
            ) : (
              <span>Upload PDF documents to continue</span>
            )}
          </div>
          
          <Button 
            onClick={handleContinue}
            disabled={uploads.length === 0 || isUploading || successfulUploads === 0 || isProcessing}
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
