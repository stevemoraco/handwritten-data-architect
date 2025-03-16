
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { UploadProgress } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { toast } from '@/hooks/use-toast';

interface UploadContextType {
  uploads: UploadProgress[];
  addUpload: (fileName: string) => string;
  updateUploadProgress: (id: string, progress: number) => void;
  updateUploadStatus: (id: string, status: UploadProgress['status'], message?: string) => void;
  updatePageProgress: (id: string, pagesProcessed: number, pageCount: number) => void;
  clearUploads: () => void;
  isUploading: boolean;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export const useUpload = () => {
  const context = useContext(UploadContext);
  if (context === undefined) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
};

interface UploadProviderProps {
  children: ReactNode;
}

export const UploadProvider = ({ children }: UploadProviderProps) => {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);

  const addUpload = (fileName: string) => {
    const id = uuidv4();
    setUploads((prev) => [
      ...prev,
      {
        id,
        fileName,
        progress: 0,
        status: 'uploading',
        pagesProcessed: 0,
        pageCount: 0
      },
    ]);
    toast({
      title: "Upload started",
      description: `${fileName} is being uploaded to storage.`,
    });
    return id;
  };

  const updateUploadProgress = (id: string, progress: number) => {
    setUploads((prev) =>
      prev.map((upload) =>
        upload.id === id ? { ...upload, progress } : upload
      )
    );
  };

  const updateUploadStatus = (
    id: string,
    status: UploadProgress['status'],
    message?: string
  ) => {
    setUploads((prev) =>
      prev.map((upload) =>
        upload.id === id ? { ...upload, status, message } : upload
      )
    );

    // Find the upload by ID before status change
    const upload = uploads.find((u) => u.id === id);
    if (!upload) return;

    // Show appropriate toast messages based on status
    switch (status) {
      case 'complete':
        toast({
          title: "Upload complete",
          description: `${upload.fileName} has been uploaded successfully.`,
        });
        break;
      case 'error':
        if (message) {
          toast({
            title: "Upload failed",
            description: message,
            variant: "destructive",
          });
        }
        break;
      case 'processing':
        if (message) {
          toast({
            title: "Processing document",
            description: message,
          });
        }
        break;
    }
  };

  const updatePageProgress = (id: string, pagesProcessed: number, pageCount: number) => {
    setUploads((prev) =>
      prev.map((upload) =>
        upload.id === id 
          ? { 
              ...upload, 
              pagesProcessed, 
              pageCount, 
              status: 'processing',
              progress: pageCount > 0 ? Math.round((pagesProcessed / pageCount) * 100) : upload.progress 
            } 
          : upload
      )
    );
    
    // If all pages are processed, show a toast
    const upload = uploads.find((u) => u.id === id);
    if (upload && pagesProcessed === pageCount && pageCount > 0) {
      toast({
        title: "Document processed",
        description: `All ${pageCount} pages of ${upload.fileName} have been processed.`,
      });
    }
  };

  const clearUploads = () => {
    setUploads([]);
  };

  const isUploading = uploads.some((upload) => upload.status === 'uploading' || upload.status === 'processing');

  return (
    <UploadContext.Provider
      value={{
        uploads,
        addUpload,
        updateUploadProgress,
        updateUploadStatus,
        updatePageProgress,
        clearUploads,
        isUploading,
      }}
    >
      {children}
    </UploadContext.Provider>
  );
};
