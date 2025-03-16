import React, { useState, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
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
import { useToast } from "@/hooks/use-toast";

const pdfBaseUrl = 'https://mozilla.github.io/pdf.js/web/viewer.html?file=';

interface FileUploadProps {
  accept?: Record<string, string[]>;
  maxFiles?: number;
  maxSize?: number;
  onFilesUploaded?: (files: File[]) => void;
  className?: string;
  disabled?: boolean;
}

export interface FilePreview {
  file: File;
  pages: {
    pageNumber: number;
    dataUrl: string;
    imageBlob?: Blob;
  }[];
  pageCount: number;
  isLoading: boolean;
  error?: string;
  storageUrl?: string;
}

export interface FileUploadRef {
  getPreviewsForFile: (file: File) => FilePreview | undefined;
  uploadPageImagesToStorage: (documentId: string, preview: FilePreview) => Promise<string[]>;
}

export const FileUpload = forwardRef<FileUploadRef, FileUploadProps>(({
  accept = {
    'application/pdf': ['.pdf'],
    'image/*': ['.jpg', '.jpeg', '.png', '.gif'],
  },
  maxFiles = 10,
  maxSize = 104857600, // 100MB
  onFilesUploaded,
  className,
  disabled = false,
}, ref) => {
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([]);
  const { uploads, isUploading, addUpload, updateUploadProgress, updateUploadStatus, updatePageProgress } = useUpload();
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();
  
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
        const storageUrl = await uploadOriginalFile(file);
        
        setFilePreviews(prev => 
          prev.map(p => 
            p.file === file 
              ? { 
                  ...p, 
                  storageUrl,
                  pageCount: 1,
                  isLoading: false,
                  pages: [{
                    pageNumber: 1,
                    dataUrl: '/placeholder.svg',
                  }]
                }
              : p
          )
        );
        
        toast({
          title: "File uploaded to storage",
          description: `${file.name} has been uploaded and is available for preview.`,
        });
        
        processPdfFile(file).catch(error => {
          console.error('PDF preview generation error:', error);
        });
      } else if (file.type.includes('image')) {
        await processImageFile(file);
      }
    } catch (error) {
      console.error(`Error generating preview for ${file.name}:`, error);
      
      try {
        const storageUrl = await uploadOriginalFile(file);
        
        setFilePreviews(prev => 
          prev.map(p => 
            p.file === file 
              ? { 
                  ...p, 
                  storageUrl,
                  isLoading: false,
                  error: "Preview generation failed, but file was uploaded successfully."
                }
              : p
          )
        );
        
        toast({
          title: "File uploaded",
          description: `${file.name} was uploaded successfully, but preview generation failed.`,
        });
      } catch (uploadError) {
        setFilePreviews(prev => 
          prev.map(p => 
            p.file === file 
              ? { 
                  ...p, 
                  isLoading: false, 
                  error: uploadError instanceof Error ? uploadError.message : 'Failed to upload file'
                }
              : p
          )
        );
        
        toast({
          title: "Upload failed",
          description: uploadError instanceof Error ? uploadError.message : "Failed to upload file",
          variant: "destructive"
        });
      }
    }
  };

  const processPdfFile = async (file: File) => {
    try {
      const fileArrayBuffer = await file.arrayBuffer();
      
      const pdf = await pdfjsLib.getDocument({ data: fileArrayBuffer }).promise;
      const pageCount = pdf.numPages;
      
      const pagesToRender = Math.min(pageCount, 5);
      const pagePromises = [];
      
      for (let i = 1; i <= pagesToRender; i++) {
        pagePromises.push(renderPdfPage(pdf, i));
      }
      
      const pageDataObjects = await Promise.all(pagePromises);
      
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
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
      
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

  const uploadPageImagesToStorage = async (documentId: string, preview: FilePreview): Promise<string[]> => {
    if (!userId) throw new Error('User not authenticated');
    
    const imageUrls: string[] = [];
    
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
      
      const { data: urlData } = supabase.storage
        .from('document_files')
        .getPublicUrl(filePath);
      
      if (urlData && urlData.publicUrl) {
        imageUrls.push(urlData.publicUrl);
      }
    }
    
    return imageUrls;
  };

  const uploadOriginalFile = async (file: File): Promise<string> => {
    if (!userId) throw new Error('User not authenticated');
    
    const tempId = Math.random().toString(36).substring(2, 15);
    const filePath = `${userId}/temp/${tempId}/${file.name}`;
    
    toast({
      title: "Uploading file...",
      description: `${file.name} is being uploaded to storage.`,
    });
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('document_files')
      .upload(filePath, file, {
        contentType: file.type,
        cacheControl: '3600'
      });
    
    if (uploadError) {
      console.error(`Error uploading original file:`, uploadError);
      toast({
        title: "Upload failed",
        description: uploadError.message,
        variant: "destructive"
      });
      throw uploadError;
    }
    
    const { data: urlData } = supabase.storage
      .from('document_files')
      .getPublicUrl(filePath);
    
    if (!urlData || !urlData.publicUrl) {
      toast({
        title: "Upload failed",
        description: "Failed to get public URL for uploaded file",
        variant: "destructive"
      });
      throw new Error('Failed to get public URL for uploaded file');
    }
    
    toast({
      title: "Upload complete",
      description: `${file.name} has been uploaded successfully.`,
    });
    
    setFilePreviews(prev => 
      prev.map(p => 
        p.file === file 
          ? { ...p, storageUrl: urlData.publicUrl }
          : p
      )
    );
    
    return urlData.publicUrl;
  };

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

  useImperativeHandle(ref, () => ({
    getPreviewsForFile,
    uploadPageImagesToStorage
  }));

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
          <p className="text-sm font-medium">Selected Files</p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filePreviews.map((preview) => {
              const uploadStatus = uploads.find(upload => upload.fileName === preview.file.name);
              
              return (
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
                    <div className="flex space-x-1">
                      {preview.storageUrl && (
                        <Button
                          variant="default"
                          size="sm"
                          className="h-7"
                          onClick={() => window.open(preview.storageUrl, '_blank')}
                          title="View file in storage"
                        >
                          <ExternalLinkIcon className="h-4 w-4 mr-1" /> 
                          Preview
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => removeFile(preview.file)}
                      >
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </div>
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
                          {!preview.storageUrl && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="mt-2"
                              onClick={async () => {
                                try {
                                  const url = await uploadOriginalFile(preview.file);
                                  toast({
                                    title: "File uploaded",
                                    description: "Original file uploaded to storage",
                                  });
                                } catch (error) {
                                  console.error('Error uploading file:', error);
                                  toast({
                                    title: "Upload failed",
                                    description: error instanceof Error ? error.message : "Failed to upload file",
                                    variant: "destructive"
                                  });
                                }
                              }}
                            >
                              Upload Original
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        {preview.storageUrl && preview.file.type.includes('pdf') && (
                          <div className="p-3 mb-2 flex justify-center">
                            <Button 
                              variant="outline" 
                              onClick={() => window.open(preview.storageUrl, '_blank')}
                              className="w-full"
                            >
                              <FileIcon className="h-4 w-4 mr-2" />
                              View Original PDF
                            </Button>
                          </div>
                        )}
                        
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
                        
                        {uploadStatus && (
                          <div className="p-3 border-t">
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="flex items-center">
                                  {uploadStatus.status === 'uploading' && 'Uploading file...'}
                                  {uploadStatus.status === 'processing' && (
                                    <>
                                      <ImageIcon className="h-3 w-3 mr-1" />
                                      {uploadStatus.pagesProcessed && uploadStatus.pageCount ? 
                                        `Converting page ${uploadStatus.pagesProcessed} of ${uploadStatus.pageCount}` : 
                                        'Processing document'}
                                    </>
                                  )}
                                  {uploadStatus.status === 'complete' && (
                                    <>
                                      <CheckIcon className="h-3 w-3 mr-1" />
                                      {uploadStatus.pageCount ? `${uploadStatus.pageCount} pages processed` : 'Complete'}
                                    </>
                                  )}
                                  {uploadStatus.status === 'error' && 'Error'}
                                </span>
                                <span>{uploadStatus.progress}%</span>
                              </div>
                              <Progress value={uploadStatus.progress} className="h-1" />
                            </div>
                            
                            {uploadStatus.status === 'error' && uploadStatus.message && (
                              <div className="mt-2 text-xs text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">
                                {uploadStatus.message}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

FileUpload.displayName = 'FileUpload';
