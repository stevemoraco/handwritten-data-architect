
import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileIcon, UploadIcon, XIcon, CheckIcon, AlertCircleIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useUpload } from '@/context/UploadContext';

interface FileUploadProps {
  accept?: Record<string, string[]>;
  maxFiles?: number;
  maxSize?: number;
  onFilesUploaded?: (files: File[]) => void;
  className?: string;
  disabled?: boolean;
}

export function FileUpload({
  accept = {
    'application/pdf': ['.pdf'],
    'image/*': ['.jpg', '.jpeg', '.png', '.gif'],
  },
  maxFiles = 10,
  maxSize = 10485760, // 10MB
  onFilesUploaded,
  className,
  disabled = false,
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const { uploads, addUpload, updateUploadProgress, updateUploadStatus, isUploading } = useUpload();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setFiles((currentFiles) => {
        const newFiles = acceptedFiles.filter(
          (file) => !currentFiles.some((f) => f.name === file.name && f.size === file.size)
        );
        
        if (onFilesUploaded) {
          onFilesUploaded(newFiles);
        }

        // Simulate file upload for each file
        newFiles.forEach((file) => {
          const uploadId = addUpload(file.name);
          simulateFileUpload(file, uploadId);
        });

        return [...currentFiles, ...newFiles];
      });
    },
    [addUpload, onFilesUploaded]
  );

  const simulateFileUpload = (file: File, uploadId: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 10) + 5;
      if (progress >= 100) {
        clearInterval(interval);
        progress = 100;
        updateUploadProgress(uploadId, progress);
        updateUploadStatus(uploadId, 'complete');
      } else {
        updateUploadProgress(uploadId, progress);
      }
    }, 300);
  };

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    maxSize,
    disabled: disabled || isUploading,
  });

  const removeFile = (fileToRemove: File) => {
    setFiles((currentFiles) => currentFiles.filter((file) => file !== fileToRemove));
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          {
            'border-primary/50 bg-primary/5': isDragActive && !isDragReject,
            'border-destructive/50 bg-destructive/5': isDragReject,
            'border-muted-foreground/20 hover:border-muted-foreground/30 hover:bg-muted/30':
              !isDragActive && !isDragReject && !disabled,
            'border-muted-foreground/10 bg-muted/10 cursor-not-allowed opacity-60': disabled || isUploading,
          }
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-3">
          <UploadIcon className="h-12 w-12 text-muted-foreground/50" />
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {isDragActive ? "Drop the files here" : "Drag & drop files here"}
            </p>
            <p className="text-xs text-muted-foreground">
              or click to browse (PDF, JPG, PNG, GIF)
            </p>
          </div>
          {!disabled && !isUploading && (
            <Button type="button" variant="outline" size="sm">
              Select Files
            </Button>
          )}
          {isUploading && (
            <p className="text-xs text-muted-foreground animate-pulse">
              Uploading files...
            </p>
          )}
          {maxFiles && (
            <p className="text-xs text-muted-foreground">
              Upload up to {maxFiles} files (max {maxSize / 1048576}MB each)
            </p>
          )}
        </div>
      </div>

      {uploads.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Upload Progress</p>
          {uploads.map((upload) => (
            <Card key={upload.id} className="p-3">
              <div className="flex items-center space-x-3">
                <FileIcon className="h-6 w-6 text-primary/70" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{upload.fileName}</p>
                  <div className="mt-1">
                    <Progress value={upload.progress} className="h-2" />
                  </div>
                </div>
                <Badge
                  variant={
                    upload.status === 'complete'
                      ? 'default'
                      : upload.status === 'error'
                      ? 'destructive'
                      : 'outline'
                  }
                  className="ml-2"
                >
                  {upload.status === 'complete' && <CheckIcon className="h-3 w-3 mr-1" />}
                  {upload.status === 'error' && <AlertCircleIcon className="h-3 w-3 mr-1" />}
                  {upload.status}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
