
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { UploadProgress } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { toast } from '@/components/ui/use-toast';

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

    // Only show toast for completion, not for errors
    const upload = uploads.find((u) => u.id === id);
    if (upload && status === 'complete') {
      toast({
        title: 'Upload complete',
        description: `${upload.fileName} has been uploaded successfully.`,
      });
    }
    // We no longer show error toasts as they'll be displayed in the UI
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
