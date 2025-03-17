
import * as React from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Upload, 
  File, 
  X, 
  Check, 
  AlertTriangle, 
  Image as ImageIcon, 
  Loader2
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import * as pdfjsLib from "pdfjs-dist";

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.0.375/build/pdf.worker.min.js';

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: 'idle' | 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
  thumbnails: string[];
  pageCount: number;
  documentId?: string;
}

interface DocumentUploaderProps {
  onUploadComplete?: (documentIds: string[]) => void;
  className?: string;
  maxFiles?: number;
}

export function DocumentUploader({ 
  onUploadComplete, 
  className = "",
  maxFiles = 10 
}: DocumentUploaderProps) {
  const { user } = useAuth();
  const [files, setFiles] = React.useState<UploadFile[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const [bucketInitialized, setBucketInitialized] = React.useState(false);
  
  // Initialize the storage bucket if needed
  React.useEffect(() => {
    if (!user || bucketInitialized) return;

    const initBucket = async () => {
      try {
        // Check if document_files bucket exists
        const { data, error } = await supabase.storage.getBucket('document_files');
        
        if (error && error.message.includes('not found')) {
          console.log("Creating document_files bucket...");
          const { error: createError } = await supabase.storage.createBucket('document_files', {
            public: true,
            fileSizeLimit: 100000000 // 100MB
          });
          
          if (createError) {
            console.error("Error creating bucket:", createError);
            toast({
              title: "Storage initialization failed",
              description: "Could not create storage for documents. Some features may not work.",
              variant: "destructive"
            });
            return;
          }
          
          // Set bucket policy to public
          const { error: policyError } = await supabase.storage.from('document_files').getPublicUrl('test');
          if (policyError) {
            console.error("Error with bucket policy:", policyError);
          }
          
          console.log("Storage bucket created successfully");
        }
        
        setBucketInitialized(true);
      } catch (error) {
        console.error("Error initializing storage:", error);
      }
    };
    
    initBucket();
  }, [user, bucketInitialized]);
  
  const onDrop = React.useCallback(async (acceptedFiles: File[]) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to upload documents",
        variant: "destructive"
      });
      return;
    }
    
    if (acceptedFiles.length === 0) return;
    
    // Check for file size limits
    const oversizedFiles = acceptedFiles.filter(file => file.size > 100000000);
    if (oversizedFiles.length > 0) {
      toast({
        title: "Files too large",
        description: `${oversizedFiles.length} file(s) exceed the 100MB limit`,
        variant: "destructive"
      });
      
      // Filter out oversized files
      const validFiles = acceptedFiles.filter(file => file.size <= 100000000);
      if (validFiles.length === 0) return;
    }
    
    // Add new files to the queue
    const newUploadFiles = acceptedFiles.map(file => ({
      id: uuidv4(),
      file,
      progress: 0,
      status: 'idle' as const,
      thumbnails: [],
      pageCount: 0
    }));
    
    setFiles(prev => [...prev, ...newUploadFiles]);
    
    // Start upload process
    if (!uploading) {
      setUploading(true);
      processUploads([...files, ...newUploadFiles]);
    }
  }, [files, uploading, user]);
  
  const processUploads = async (filesToProcess: UploadFile[]) => {
    const pendingFiles = filesToProcess.filter(f => f.status === 'idle');
    if (pendingFiles.length === 0) {
      setUploading(false);
      return;
    }
    
    // Process one file at a time
    const currentFile = pendingFiles[0];
    
    try {
      // Update status to uploading
      setFiles(prev => 
        prev.map(f => 
          f.id === currentFile.id 
            ? { ...f, status: 'uploading', progress: 10 } 
            : f
        )
      );
      
      // Check for duplicates
      const { data: existingDocs, error: queryError } = await supabase
        .from("documents")
        .select("id, name, size")
        .eq("user_id", user!.id)
        .eq("name", currentFile.file.name);
      
      if (!queryError && existingDocs && existingDocs.length > 0) {
        // Check size for potential duplicates
        const potentialDuplicate = existingDocs.find(doc => 
          Math.abs(doc.size - currentFile.file.size) < 100
        );
        
        if (potentialDuplicate) {
          setFiles(prev => 
            prev.map(f => 
              f.id === currentFile.id 
                ? { 
                    ...f, 
                    status: 'complete', 
                    progress: 100,
                    documentId: potentialDuplicate.id 
                  } 
                : f
            )
          );
          
          toast({
            title: "Duplicate detected",
            description: `"${currentFile.file.name}" already exists in your documents.`,
          });
          
          // Continue with other files
          processUploads(filesToProcess.filter(f => f.id !== currentFile.id));
          return;
        }
      }
      
      // Create document record
      const documentId = uuidv4();
      const fileType = currentFile.file.type.includes('pdf') ? 'pdf' : 'image';
      
      const { error: createError } = await supabase
        .from("documents")
        .insert({
          id: documentId,
          name: currentFile.file.name,
          type: fileType,
          status: 'uploading',
          user_id: user!.id,
          size: currentFile.file.size
        });
        
      if (createError) {
        throw new Error(`Failed to create document record: ${createError.message}`);
      }
      
      // Update progress
      setFiles(prev => 
        prev.map(f => 
          f.id === currentFile.id 
            ? { ...f, progress: 20, documentId } 
            : f
        )
      );
      
      // Create storage path
      const filePath = `${user!.id}/${documentId}/original${fileType === 'pdf' ? '.pdf' : ''}`;
      
      // Upload file
      const { error: uploadError } = await supabase.storage
        .from('document_files')
        .upload(filePath, currentFile.file, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (uploadError) {
        throw new Error(`Failed to upload file: ${uploadError.message}`);
      }
      
      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('document_files')
        .getPublicUrl(filePath);
        
      if (!urlData || !urlData.publicUrl) {
        throw new Error("Failed to get public URL for the file");
      }
      
      // Update document with URL
      const { error: updateError } = await supabase
        .from("documents")
        .update({
          original_url: urlData.publicUrl,
          url: urlData.publicUrl,
          status: 'processing'
        })
        .eq("id", documentId);
        
      if (updateError) {
        throw new Error(`Failed to update document URL: ${updateError.message}`);
      }
      
      // Update progress
      setFiles(prev => 
        prev.map(f => 
          f.id === currentFile.id 
            ? { ...f, progress: 50, status: 'processing' } 
            : f
        )
      );
      
      // Process preview and get page count
      const thumbnails: string[] = [];
      let pageCount = 1;
      
      // For PDFs, generate previews and get page count
      if (fileType === 'pdf') {
        try {
          // Load PDF and get page count
          const arrayBuffer = await currentFile.file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          pageCount = pdf.numPages;
          
          // Update progress
          setFiles(prev => 
            prev.map(f => 
              f.id === currentFile.id 
                ? { ...f, progress: 60, pageCount } 
                : f
            )
          );
          
          // Generate thumbnails for up to 5 pages
          const pagesToRender = Math.min(pageCount, 5);
          for (let i = 1; i <= pagesToRender; i++) {
            // Render page to canvas
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 0.2 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            if (!context) {
              console.error("Failed to get canvas context");
              continue;
            }
            
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            await page.render({
              canvasContext: context,
              viewport
            }).promise;
            
            // Convert to blob and upload
            const blob = await new Promise<Blob>((resolve) => {
              canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.7);
            });
            
            const thumbnailPath = `${user!.id}/${documentId}/pages/page-${i}.jpg`;
            
            const { error: thumbnailError } = await supabase.storage
              .from('document_files')
              .upload(thumbnailPath, blob, {
                contentType: 'image/jpeg',
                upsert: true
              });
              
            if (thumbnailError) {
              console.error(`Error uploading page ${i} thumbnail:`, thumbnailError);
              continue;
            }
            
            // Get thumbnail URL
            const { data: thumbUrlData } = supabase.storage
              .from('document_files')
              .getPublicUrl(thumbnailPath);
              
            if (thumbUrlData && thumbUrlData.publicUrl) {
              thumbnails.push(thumbUrlData.publicUrl);
              
              // Create document page record
              await supabase.from("document_pages").insert({
                document_id: documentId,
                page_number: i,
                image_url: thumbUrlData.publicUrl
              });
            }
            
            // Update progress incrementally
            const progressIncrement = 30 / pagesToRender;
            setFiles(prev => 
              prev.map(f => 
                f.id === currentFile.id 
                  ? { 
                      ...f, 
                      progress: Math.min(60 + (i * progressIncrement), 90),
                      thumbnails: [...thumbnails]
                    } 
                  : f
              )
            );
          }
        } catch (error) {
          console.error("Error processing PDF:", error);
          // Continue despite errors in thumbnail generation
        }
      } else if (fileType === 'image') {
        // For images, use the original as thumbnail
        thumbnails.push(urlData.publicUrl);
        
        // Create a single page record
        await supabase.from("document_pages").insert({
          document_id: documentId,
          page_number: 1,
          image_url: urlData.publicUrl
        });
      }
      
      // Update document with page count and status
      await supabase
        .from("documents")
        .update({
          page_count: pageCount,
          status: 'processed'
        })
        .eq("id", documentId);
        
      // Log successful processing
      await supabase.from("processing_logs").insert({
        document_id: documentId,
        action: "upload",
        status: "success",
        message: `Document uploaded and processed with ${pageCount} pages`
      });
      
      // Mark as complete
      setFiles(prev => 
        prev.map(f => 
          f.id === currentFile.id 
            ? { 
                ...f, 
                progress: 100, 
                status: 'complete',
                thumbnails,
                pageCount
              } 
            : f
        )
      );
      
      toast({
        title: "Upload complete",
        description: `${currentFile.file.name} processed successfully.`
      });
    } catch (error) {
      console.error(`Error processing ${currentFile.file.name}:`, error);
      
      // Log error to database if we have a document ID
      if (currentFile.documentId) {
        await supabase.from("processing_logs").insert({
          document_id: currentFile.documentId,
          action: "upload",
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error"
        });
        
        // Update document status
        await supabase
          .from("documents")
          .update({
            status: 'failed',
            processing_error: error instanceof Error ? error.message : "Unknown error"
          })
          .eq("id", currentFile.documentId);
      }
      
      // Update file status
      setFiles(prev => 
        prev.map(f => 
          f.id === currentFile.id 
            ? { 
                ...f, 
                status: 'error', 
                error: error instanceof Error ? error.message : "Unknown error" 
              } 
            : f
        )
      );
      
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error during upload",
        variant: "destructive"
      });
    }
    
    // Continue with other files
    processUploads(filesToProcess.filter(f => f.id !== currentFile.id));
  };
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    maxFiles,
    disabled: !user || uploading
  });
  
  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };
  
  const getUploadedDocumentIds = (): string[] => {
    return files
      .filter(f => f.status === 'complete' && f.documentId)
      .map(f => f.documentId!)
      .filter(Boolean);
  };
  
  const handleComplete = () => {
    const documentIds = getUploadedDocumentIds();
    if (documentIds.length === 0) {
      toast({
        title: "No documents",
        description: "Please upload at least one document.",
        variant: "destructive"
      });
      return;
    }
    
    if (onUploadComplete) {
      onUploadComplete(documentIds);
    }
  };
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Documents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center transition-colors
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 hover:border-muted-foreground/30'}
            ${!user || uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center space-y-2">
            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">
              {!user ? "Please log in to upload" : isDragActive ? "Drop files here" : "Drag & drop files here"}
            </p>
            <p className="text-xs text-muted-foreground">
              {user ? "or click to browse (PDF, JPG, PNG)" : "Login required for upload"}
            </p>
            
            {user && !uploading && (
              <Button type="button" variant="outline" size="sm" className="mt-2">
                Select Files
              </Button>
            )}
            
            <p className="text-xs text-muted-foreground mt-4">
              Upload up to {maxFiles} files (max 100MB each)
            </p>
          </div>
        </div>
        
        {files.length > 0 && (
          <div className="space-y-4">
            <div className="text-sm font-medium">Documents ({files.length})</div>
            <div className="grid gap-3">
              {files.map((file) => (
                <div 
                  key={file.id}
                  className="border rounded-md overflow-hidden"
                >
                  <div className="flex items-center justify-between p-3 bg-muted/30">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="shrink-0">
                        <File className="h-5 w-5 text-primary/70" />
                      </div>
                      <div className="min-w-0 overflow-hidden">
                        <p className="text-sm font-medium truncate">{file.file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.file.size / 1024 / 1024).toFixed(2)} MB
                          {file.pageCount > 0 && ` • ${file.pageCount} page${file.pageCount !== 1 ? 's' : ''}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {file.status === 'uploading' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                      {file.status === 'processing' && <ImageIcon className="h-4 w-4 text-amber-500" />}
                      {file.status === 'complete' && <Check className="h-4 w-4 text-green-500" />}
                      {file.status === 'error' && <AlertTriangle className="h-4 w-4 text-destructive" />}
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeFile(file.id)}
                        disabled={file.status === 'uploading' || file.status === 'processing'}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="px-3 pb-3">
                    <div className="pt-3">
                      <Progress value={file.progress} className="h-2" />
                      <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                        <span>
                          {file.status === 'idle' && 'Pending'}
                          {file.status === 'uploading' && 'Uploading...'}
                          {file.status === 'processing' && 'Processing...'}
                          {file.status === 'complete' && 'Complete'}
                          {file.status === 'error' && 'Failed'}
                        </span>
                        <span>{file.progress}%</span>
                      </div>
                    </div>
                    
                    {file.status === 'error' && file.error && (
                      <Alert className="mt-3 py-2 bg-destructive/10 border-destructive/30 text-destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle className="text-sm">Error</AlertTitle>
                        <AlertDescription className="text-xs">{file.error}</AlertDescription>
                      </Alert>
                    )}
                    
                    {file.thumbnails.length > 0 && (
                      <div className="mt-3 overflow-x-auto py-2">
                        <div className="flex space-x-2">
                          {file.thumbnails.map((url, i) => (
                            <div key={i} className="relative flex-shrink-0">
                              <img 
                                src={url} 
                                alt={`Page ${i+1}`} 
                                className="h-20 w-auto border object-contain bg-white"
                              />
                              <div className="absolute top-0 right-0 bg-black/50 text-white text-xs px-1 rounded-bl">
                                {i+1}
                              </div>
                            </div>
                          ))}
                          {file.pageCount > file.thumbnails.length && (
                            <div className="flex-shrink-0 flex items-center justify-center h-20 w-14 border border-dashed text-muted-foreground text-xs">
                              +{file.pageCount - file.thumbnails.length} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t pt-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="text-sm text-muted-foreground flex-1">
          {getUploadedDocumentIds().length} document(s) uploaded successfully
        </div>
        <Button 
          onClick={handleComplete}
          disabled={getUploadedDocumentIds().length === 0 || uploading}
        >
          Continue with Selected
        </Button>
      </CardFooter>
    </Card>
  );
}
