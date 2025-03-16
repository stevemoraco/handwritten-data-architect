
import * as React from "react";
import { FileUpload } from "@/components/ui/file-upload";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUpload } from "@/context/UploadContext";
import { useDocuments } from "@/context/DocumentContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { ArrowRight, FileText, Lock, Shield, User, AlertTriangle } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { AuthForm } from "@/components/auth/AuthForm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

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
  const { isUploading, uploads, addUpload, updateUploadProgress, updateUploadStatus } = useUpload();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [uploadedDocumentIds, setUploadedDocumentIds] = React.useState<string[]>([]);
  const [showAuthDialog, setShowAuthDialog] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleFilesUploaded = async (files: File[]) => {
    if (!user) {
      setShowAuthDialog(true);
      return;
    }

    setError(null);
    
    try {
      const newDocumentIds = await Promise.all(
        files.map(async (file) => {
          const uploadId = addUpload(file.name);
          
          try {
            // Create a document record in the database
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
            
            // Log the upload start
            await supabase.from('processing_logs').insert({
              document_id: document.id,
              action: 'Upload Started',
              status: 'success',
              message: `Started uploading ${file.name}`
            });
            
            console.log(`Created document record with ID: ${document.id}`);
            
            // Upload the file to storage
            const filePath = `${user.id}/${document.id}/${file.name}`;
            
            // Upload file to storage with progress tracking
            const { error: uploadError } = await supabase.storage
              .from('document_files')
              .upload(filePath, file, {
                onUploadProgress: (progress) => {
                  const percent = Math.round((progress.loaded / progress.total) * 100);
                  updateUploadProgress(uploadId, percent);
                  console.log(`Upload progress for ${file.name}: ${percent}%`);
                }
              });
            
            if (uploadError) {
              // Update document status and log error
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
            
            // Get the public URL for the file
            const { data: publicURL } = supabase.storage
              .from('document_files')
              .getPublicUrl(filePath);
            
            // Update document status and URL
            await supabase
              .from('documents')
              .update({
                status: 'uploaded',
                original_url: publicURL.publicUrl,
                updated_at: new Date().toISOString()
              })
              .eq('id', document.id);
            
            // Log upload success
            await supabase.from('processing_logs').insert({
              document_id: document.id,
              action: 'Upload Completed',
              status: 'success',
              message: `Successfully uploaded ${file.name}`
            });
            
            updateUploadStatus(uploadId, 'complete');
            console.log(`File uploaded successfully: ${file.name}`);
            
            // Start document processing
            try {
              setIsProcessing(true);
              
              // Call the document processing edge function
              const { data: processingResult, error: processingError } = await supabase.functions
                .invoke('process-document', {
                  body: { documentId: document.id }
                });
              
              if (processingError) {
                throw new Error(`Document processing failed: ${processingError.message}`);
              }
              
              console.log('Processing result:', processingResult);
              setIsProcessing(false);
            } catch (processingError) {
              console.error('Error processing document:', processingError);
              setIsProcessing(false);
              
              // Log processing error
              await supabase.from('processing_logs').insert({
                document_id: document.id,
                action: 'Processing Error',
                status: 'error',
                message: processingError.message || 'Unknown processing error'
              });
              
              // Don't throw here to allow the document ID to be returned
              toast({
                title: 'Processing Warning',
                description: `Your file was uploaded but processing encountered an issue: ${processingError.message}`,
                variant: 'destructive',
              });
            }
            
            return document.id;
          } catch (error) {
            console.error(`Error uploading ${file.name}:`, error);
            updateUploadStatus(uploadId, 'error', error.message);
            toast({
              title: 'Upload failed',
              description: error.message || 'An unknown error occurred',
              variant: 'destructive',
            });
            throw error;
          }
        })
      ).catch(error => {
        console.error('Error in upload process:', error);
        setError(`Upload failed: ${error.message}`);
        return [];
      });
      
      // Filter out any failed uploads
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
      toast({
        title: 'Upload failed',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleContinue = () => {
    if (onDocumentsUploaded && uploadedDocumentIds.length > 0) {
      onDocumentsUploaded(uploadedDocumentIds);
    } else if (uploadedDocumentIds.length > 0) {
      // Navigate to document view if no callback is provided
      navigate(`/document/${uploadedDocumentIds[0]}`);
    }
  };

  const handleAuthComplete = () => {
    setShowAuthDialog(false);
    toast({
      title: "Account created successfully",
      description: "You can now securely upload and process your documents.",
    });
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
            onFilesUploaded={handleFilesUploaded}
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

      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Create Your Secure Account
            </DialogTitle>
            <DialogDescription className="pt-2 pb-1">
              <div className="space-y-2">
                <p>
                  Your documents contain valuable information. Creating an account ensures your data remains 
                  secure and accessible only to you.
                </p>
                <div className="pt-1 flex flex-col space-y-1.5">
                  <div className="flex items-start gap-2">
                    <Lock className="h-4 w-4 mt-0.5 text-primary" />
                    <span className="text-sm">End-to-end security for your sensitive documents</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Shield className="h-4 w-4 mt-0.5 text-primary" />
                    <span className="text-sm">Complete control over your data and processing history</span>
                  </div>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <AuthForm onComplete={handleAuthComplete} />
        </DialogContent>
      </Dialog>
    </>
  );
}
