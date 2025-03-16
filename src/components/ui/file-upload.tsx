
import * as React from "react";
import { UploadIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDropzone } from "react-dropzone";
import { useUpload } from "@/context/UploadContext";
import { simulateFileUpload } from "@/services/documentService";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/use-toast";
import { useDocuments } from "@/context/DocumentContext";

interface FileUploadProps {
  className?: string;
  maxFiles?: number;
  accept?: Record<string, string[]>;
  disabled?: boolean;
  onUploadComplete?: (urls: string[]) => void;
}

export function FileUpload({
  className,
  maxFiles = 10,
  accept = { 'application/pdf': ['.pdf'] },
  disabled = false,
  onUploadComplete,
}: FileUploadProps) {
  const { addUpload, updateUploadProgress, updateUploadStatus } = useUpload();
  const { addDocument } = useDocuments();
  const [uploading, setUploading] = React.useState(false);

  const onDrop = React.useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      
      setUploading(true);
      const uploadIds: string[] = [];
      const uploadedUrls: string[] = [];
      
      try {
        await Promise.all(
          acceptedFiles.map(async (file) => {
            const uploadId = addUpload(file.name);
            uploadIds.push(uploadId);
            
            try {
              const url = await simulateFileUpload(file, (progress) => {
                updateUploadProgress(uploadId, progress);
              });
              
              uploadedUrls.push(url);
              updateUploadStatus(uploadId, 'complete');
              
              // Add document to the system
              await addDocument({
                name: file.name,
                type: 'pdf',
                status: 'uploaded',
                url,
              });
              
            } catch (error) {
              updateUploadStatus(
                uploadId,
                'error',
                error instanceof Error ? error.message : 'Upload failed'
              );
            }
          })
        );
        
        if (uploadedUrls.length > 0) {
          toast({
            title: "Files uploaded successfully",
            description: `${uploadedUrls.length} files have been uploaded.`,
          });
          
          if (onUploadComplete) {
            onUploadComplete(uploadedUrls);
          }
        }
      } catch (error) {
        toast({
          title: "Upload failed",
          description: error instanceof Error ? error.message : "Failed to upload files",
          variant: "destructive",
        });
      } finally {
        setUploading(false);
      }
    },
    [addUpload, updateUploadProgress, updateUploadStatus, addDocument, onUploadComplete]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles,
    accept,
    disabled: disabled || uploading,
  });

  return (
    <div className={cn("", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-12 transition-colors hover:border-primary/50 hover:bg-background/50",
          isDragActive
            ? "border-primary/50 bg-background/50"
            : "border-border bg-background/20",
          (disabled || uploading) && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <div className="rounded-full bg-background p-4 shadow-sm">
            <UploadIcon className="h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="text-lg font-medium">Drag & drop files here</p>
            <p className="text-sm text-muted-foreground">
              or click to browse
            </p>
          </div>
          <Button
            disabled={disabled || uploading}
            variant="secondary"
            className="mt-2"
          >
            Select Files
          </Button>
          <p className="text-xs text-muted-foreground">
            PDF files only, up to {maxFiles} files
          </p>
        </div>
      </div>
    </div>
  );
}

export function UploadProgress() {
  const { uploads } = useUpload();
  
  if (uploads.length === 0) return null;
  
  return (
    <div className="space-y-4 mt-6">
      <h3 className="text-sm font-medium">Uploads</h3>
      <div className="space-y-3">
        {uploads.map((upload) => (
          <div key={upload.id} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground truncate max-w-[75%]">
                {upload.fileName}
              </span>
              <span className="font-medium">
                {upload.status === 'uploading'
                  ? `${upload.progress}%`
                  : upload.status === 'complete'
                  ? 'Complete'
                  : 'Failed'}
              </span>
            </div>
            <Progress
              value={upload.progress}
              className={cn(
                "h-1",
                upload.status === 'error' && "bg-destructive/20"
              )}
              indicatorClassName={cn(
                upload.status === 'error' && "bg-destructive"
              )}
            />
            {upload.message && (
              <p className="text-xs text-destructive mt-1">{upload.message}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
