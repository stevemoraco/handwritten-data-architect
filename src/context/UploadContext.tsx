
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { UploadProgress } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { toast } from '@/components/ui/use-toast';

interface UploadContextType {
  uploads: UploadProgress[];
  addUpload: (fileName: string) => string;
  updateUploadProgress: (id: string, progress: number) => void;
  updateUploadStatus: (id: string, status: UploadProgress['status'], message?: string) => void;
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

    // Show toast for completed or errored uploads
    const upload = uploads.find((u) => u.id === id);
    if (upload) {
      if (status === 'complete') {
        toast({
          title: 'Upload complete',
          description: `${upload.fileName} has been uploaded successfully.`,
        });
      } else if (status === 'error') {
        toast({
          title: 'Upload failed',
          description: message || `Failed to upload ${upload.fileName}.`,
          variant: 'destructive',
        });
      }
    }
  };

  const clearUploads = () => {
    setUploads([]);
  };

  const isUploading = uploads.some((upload) => upload.status === 'uploading');

  return (
    <UploadContext.Provider
      value={{
        uploads,
        addUpload,
        updateUploadProgress,
        updateUploadStatus,
        clearUploads,
        isUploading,
      }}
    >
      {children}
    </UploadContext.Provider>
  );
};
