
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileIcon, UploadIcon, XIcon, CheckIcon, AlertCircleIcon, ImageIcon } from 'lucide-react';
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
  maxSize = 104857600, // 100MB (increased from 10MB)
  onFilesUploaded,
  className,
  disabled = false,
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const { uploads, isUploading } = useUpload();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles = acceptedFiles.filter(
        (file) => !files.some((f) => f.name === file.name && f.size === file.size)
      );
      
      setFiles((currentFiles) => [...currentFiles, ...newFiles]);
      
      if (newFiles.length > 0 && onFilesUploaded) {
        onFilesUploaded(newFiles);
      }
    },
    [files, onFilesUploaded]
  );

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

  // Helper function to get formatted file size
  const getFormattedSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
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
        <div className="flex flex-col items-center justify-center space-y-2">
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
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium truncate">{upload.fileName}</p>
                  </div>
                  
                  {/* Different progress display for different stages */}
                  <div className="mt-1">
                    {/* File upload progress */}
                    {upload.status === 'uploading' && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Uploading file</span>
                          <span>{upload.progress}%</span>
                        </div>
                        <Progress value={upload.progress} className="h-2" />
                      </div>
                    )}
                    
                    {/* Processing progress with page count */}
                    {upload.status === 'processing' && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="flex items-center">
                            <ImageIcon className="h-3 w-3 mr-1" />
                            {upload.pagesProcessed && upload.pageCount ? 
                              `Converting page ${upload.pagesProcessed} of ${upload.pageCount}` : 
                              'Processing document'}
                          </span>
                          <span>
                            {upload.pagesProcessed && upload.pageCount ? 
                              `${Math.round((upload.pagesProcessed / upload.pageCount) * 100)}%` : 
                              'Processing...'}
                          </span>
                        </div>
                        <Progress 
                          value={upload.pageCount ? (upload.pagesProcessed / upload.pageCount) * 100 : 0} 
                          className="h-2" 
                        />
                      </div>
                    )}
                    
                    {/* Simple progress bar for completed or other states */}
                    {(upload.status === 'complete' || (upload.status !== 'uploading' && upload.status !== 'processing' && upload.status !== 'error')) && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="flex items-center">
                            <CheckIcon className="h-3 w-3 mr-1" />
                            {upload.pageCount ? `${upload.pageCount} pages processed` : 'Processing complete'}
                          </span>
                          <span>100%</span>
                        </div>
                        <Progress value={100} className="h-2" />
                      </div>
                    )}
                    
                    {/* Error message display */}
                    {upload.status === 'error' && upload.message && (
                      <div className="mt-2 text-xs text-destructive bg-destructive/10 p-2 rounded border border-destructive/20 whitespace-normal">
                        <p className="font-medium mb-1">Error:</p>
                        <p className="break-words">{upload.message}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <Badge
                  variant={
                    upload.status === 'complete'
                      ? 'default'
                      : upload.status === 'error'
                      ? 'destructive'
                      : upload.status === 'processing'
                      ? 'secondary'
                      : 'outline'
                  }
                  className="ml-2 whitespace-nowrap"
                >
                  {upload.status === 'complete' && <CheckIcon className="h-3 w-3 mr-1" />}
                  {upload.status === 'error' && <AlertCircleIcon className="h-3 w-3 mr-1" />}
                  {upload.status === 'processing' && <ImageIcon className="h-3 w-3 mr-1" />}
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
