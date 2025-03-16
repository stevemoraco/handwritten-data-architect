
import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileIcon, UploadIcon, XIcon, CheckIcon, AlertCircleIcon, ImageIcon, ExternalLinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useUpload } from '@/context/UploadContext';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';
import { supabase } from '@/integrations/supabase/client';

// Import the PDF.js worker from a CDN or local path that is guaranteed to work
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

interface FileUploadProps {
  accept?: Record<string, string[]>;
  maxFiles?: number;
  maxSize?: number;
  onFilesUploaded?: (files: File[]) => void;
  className?: string;
  disabled?: boolean;
}

interface FilePreview {
  file: File;
  pages: {
    pageNumber: number;
    dataUrl: string;
    imageBlob?: Blob;
  }[];
  pageCount: number;
  isLoading: boolean;
  error?: string;
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
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([]);
  const { uploads, isUploading, addUpload, updateUploadProgress, updateUploadStatus, updatePageProgress } = useUpload();
  const [userId, setUserId] = useState<string | null>(null);
  
  // Get the current user id once on component mount
  useEffect(() => {
    const fetchUserId = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUserId(data.user.id);
      }
    };
    
    fetchUserId();
  }, []);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles = acceptedFiles.filter(
        (file) => !files.some((f) => f.name === file.name && f.size === file.size)
      );
      
      if (newFiles.length > 0) {
        setFiles((currentFiles) => [...currentFiles, ...newFiles]);
        
        newFiles.forEach(generateFilePreviews);
        
        if (onFilesUploaded) {
          onFilesUploaded(newFiles);
        }
      }
    },
    [files, onFilesUploaded]
  );

  const generateFilePreviews = async (file: File) => {
    const newPreview: FilePreview = {
      file,
      pages: [],
      pageCount: 0,
      isLoading: true
    };
    
    setFilePreviews(prev => [...prev, newPreview]);
    
    try {
      if (file.type.includes('pdf')) {
        await processPdfFile(file);
      } else if (file.type.includes('image')) {
        await processImageFile(file);
      }
    } catch (error) {
      console.error(`Error generating preview for ${file.name}:`, error);
      setFilePreviews(prev => 
        prev.map(p => 
          p.file === file 
            ? { ...p, isLoading: false, error: error instanceof Error ? error.message : 'Failed to generate preview' }
            : p
        )
      );
    }
  };

  const processPdfFile = async (file: File) => {
    try {
      const fileArrayBuffer = await file.arrayBuffer();
      
      // Load the PDF using PDF.js
      const pdf = await pdfjsLib.getDocument({ data: fileArrayBuffer }).promise;
      const pageCount = pdf.numPages;
      
      const pagesToRender = Math.min(pageCount, 5);
      const pagePromises = [];
      
      for (let i = 1; i <= pagesToRender; i++) {
        pagePromises.push(renderPdfPage(pdf, i));
      }
      
      const pageDataObjects = await Promise.all(pagePromises);
      
      // Update the preview with the rendered pages
      setFilePreviews(prev => 
        prev.map(p => 
          p.file === file 
            ? { 
                ...p, 
                pages: pageDataObjects,
                pageCount,
                isLoading: false
              }
            : p
        )
      );
    } catch (error) {
      console.error('PDF processing error:', error);
      throw error;
    }
  };

  const renderPdfPage = async (pdf: PDFDocumentProxy, pageNumber: number): Promise<{pageNumber: number, dataUrl: string, imageBlob: Blob}> => {
    try {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 0.5 });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error('Failed to get canvas context');
      }
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      await page.render({
        canvasContext: context,
        viewport
      }).promise;
      
      // Get the data URL for preview
      const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
      
      // Also create a blob for later uploading
      return new Promise<{pageNumber: number, dataUrl: string, imageBlob: Blob}>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve({
              pageNumber,
              dataUrl,
              imageBlob: blob
            });
          } else {
            reject(new Error(`Failed to create blob for page ${pageNumber}`));
          }
        }, 'image/jpeg', 0.75);
      });
    } catch (error) {
      console.error(`Error rendering page ${pageNumber}:`, error);
      throw error;
    }
  };

  const processImageFile = async (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        
        if (dataUrl) {
          // Create a blob from the data URL for later uploading
          fetch(dataUrl)
            .then(res => res.blob())
            .then(imageBlob => {
              setFilePreviews(prev => 
                prev.map(p => 
                  p.file === file 
                    ? { 
                        ...p, 
                        pages: [{ 
                          pageNumber: 1, 
                          dataUrl,
                          imageBlob 
                        }],
                        pageCount: 1,
                        isLoading: false
                      }
                    : p
                )
              );
              resolve();
            })
            .catch(err => {
              reject(new Error('Failed to create blob from image: ' + err.message));
            });
        } else {
          reject(new Error('Failed to read image file'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsDataURL(file);
    });
  };

  // Function to directly upload page images to Supabase Storage
  const uploadPageImagesToStorage = async (documentId: string, preview: FilePreview): Promise<string[]> => {
    if (!userId) throw new Error('User not authenticated');
    
    const imageUrls: string[] = [];
    
    // Upload each page as an image
    for (let i = 0; i < preview.pages.length; i++) {
      const page = preview.pages[i];
      if (!page.imageBlob) continue;
      
      const filePath = `${userId}/${documentId}/pages/page-${page.pageNumber}.jpg`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('document_files')
        .upload(filePath, page.imageBlob, {
          contentType: 'image/jpeg',
          cacheControl: '3600'
        });
      
      if (uploadError) {
        console.error(`Error uploading page ${page.pageNumber} image:`, uploadError);
        throw uploadError;
      }
      
      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('document_files')
        .getPublicUrl(filePath);
      
      if (urlData && urlData.publicUrl) {
        imageUrls.push(urlData.publicUrl);
      }
    }
    
    return imageUrls;
  };

  // This function would be called from the DocumentUpload component to upload the preview images
  const getPreviewsForFile = (file: File): FilePreview | undefined => {
    return filePreviews.find(preview => preview.file === file);
  };

  const removeFile = (fileToRemove: File) => {
    setFiles((currentFiles) => currentFiles.filter((file) => file !== fileToRemove));
    setFilePreviews(prev => prev.filter(p => p.file !== fileToRemove));
  };

  const getFormattedSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    maxSize,
    disabled: disabled || isUploading,
  });

  // Expose methods to parent components
  React.useImperativeHandle(
    React.forwardRef((_, ref) => ref),
    () => ({
      getPreviewsForFile,
      uploadPageImagesToStorage
    })
  );

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

      {filePreviews.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm font-medium">Selected Files Preview</p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filePreviews.map((preview) => (
              <Card key={preview.file.name + preview.file.size} className="overflow-hidden">
                <div className="p-3 border-b flex items-center justify-between">
                  <div className="flex items-center space-x-3 max-w-[85%]">
                    <FileIcon className="h-5 w-5 text-primary/70 flex-shrink-0" />
                    <div className="truncate">
                      <p className="text-sm font-medium truncate">{preview.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {getFormattedSize(preview.file.size)} - {preview.pageCount} page{preview.pageCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => removeFile(preview.file)}
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                </div>
                <div className="relative">
                  {preview.isLoading ? (
                    <div className="flex items-center justify-center h-40 bg-muted/40">
                      <div className="text-center">
                        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-xs text-muted-foreground">Generating preview...</p>
                      </div>
                    </div>
                  ) : preview.error ? (
                    <div className="flex items-center justify-center h-40 bg-muted/40">
                      <div className="text-center p-3">
                        <AlertCircleIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">Failed to generate preview</p>
                        <p className="text-xs text-destructive mt-1">{preview.error}</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex overflow-x-auto snap-x scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-muted-foreground/30 gap-1 p-1">
                        {preview.pages.map((page) => (
                          <div 
                            key={page.pageNumber} 
                            className="flex-shrink-0 snap-start relative w-[200px]"
                          >
                            <img 
                              src={page.dataUrl} 
                              alt={`Page ${page.pageNumber}`} 
                              className="h-40 object-contain mx-auto border border-muted bg-white"
                            />
                            <Badge variant="outline" className="absolute top-1 right-1 bg-background/80">
                              {page.pageNumber}
                            </Badge>
                          </div>
                        ))}
                        
                        {preview.pageCount > preview.pages.length && (
                          <div className="flex-shrink-0 snap-start relative w-[200px] border border-dashed border-muted flex items-center justify-center">
                            <div className="text-center p-3">
                              <p className="text-sm text-muted-foreground">
                                + {preview.pageCount - preview.pages.length} more pages
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {preview.pageCount > 1 && (
                        <div className="absolute bottom-2 left-0 right-0 flex justify-center">
                          <Badge variant="secondary" className="bg-background/80 text-xs">
                            {preview.pages.length} of {preview.pageCount} pages shown
                          </Badge>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

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
                  
                  <div className="mt-1">
                    {upload.status === 'uploading' && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Uploading file</span>
                          <span>{upload.progress}%</span>
                        </div>
                        <Progress value={upload.progress} className="h-2" />
                      </div>
                    )}
                    
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
