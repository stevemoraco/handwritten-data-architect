import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { Document, DocumentData, ProcessingLog, UploadProgress } from "@/types";

interface UploadResult {
  id: string;
  success: boolean;
  error?: string;
}

export async function uploadDocument(
  file: File,
  userId: string,
  setProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  if (!file || !userId) {
    return {
      id: "",
      success: false,
      error: "Missing file or user ID"
    };
  }

  const id = uuidv4();
  const filename = file.name;
  const fileType = file.type === "application/pdf" ? "pdf" : "image";

  try {
    // Create upload progress tracker
    const uploadId = setProgress ? 
      uuidv4() : 
      undefined;
    
    if (setProgress && uploadId) {
      setProgress({
        id: uploadId,
        fileName: filename,
        progress: 0,
        status: 'uploading'
      });
    }

    // Create document record first
    const { error: createError } = await supabase
      .from("documents")
      .insert({
        id,
        name: filename,
        type: fileType,
        status: "uploaded",
        size: file.size,
        user_id: userId
      });

    if (createError) {
      throw new Error(`Failed to create document record: ${createError.message}`);
    }

    // Update progress if callback exists
    if (setProgress && uploadId) {
      setProgress({
        id: uploadId,
        fileName: filename,
        progress: 20,
        status: 'uploading'
      });
    }

    // Upload the file to the document_files bucket
    const { error: uploadError } = await supabase.storage
      .from("document_files")
      .upload(`${userId}/${id}/${filename}`, file, {
        cacheControl: "3600"
      });

    if (uploadError) {
      await supabase
        .from("documents")
        .update({ status: "failed", processing_error: uploadError.message })
        .eq("id", id);
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    // Update progress if callback exists
    if (setProgress && uploadId) {
      setProgress({
        id: uploadId,
        fileName: filename,
        progress: 60,
        status: 'uploading'
      });
    }

    // Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from("document_files")
      .getPublicUrl(`${userId}/${id}/${filename}`);

    // Update document with URL
    const { error: updateError } = await supabase
      .from("documents")
      .update({
        original_url: publicUrlData.publicUrl,
        status: "processing"
      })
      .eq("id", id);

    if (updateError) {
      throw new Error(`Failed to update document URL: ${updateError.message}`);
    }

    // Create initial processing log
    await supabase.from("processing_logs").insert({
      document_id: id,
      action: "upload",
      status: "success",
      message: "Document uploaded successfully"
    });

    // Update progress if callback exists
    if (setProgress && uploadId) {
      setProgress({
        id: uploadId,
        fileName: filename,
        progress: 80,
        status: 'processing',
        message: 'Starting document processing...'
      });
    }

    // Start PDF to images conversion
    if (fileType === "pdf") {
      try {
        const response = await supabase.functions.invoke('pdf-to-images', {
          body: { documentId: id, userId }
        });

        if (!response.data.success) {
          throw new Error(response.data.error || "Unknown error in PDF conversion");
        }

        // Update progress with page information
        if (setProgress && uploadId) {
          setProgress({
            id: uploadId,
            fileName: filename,
            progress: 90,
            status: 'processing',
            message: `Processed ${response.data.pageCount} pages`,
            pageCount: response.data.pageCount,
            pagesProcessed: response.data.pageCount
          });
        }
      } catch (error) {
        console.error("Error in PDF to images conversion:", error);
        // We don't throw here as the upload itself was successful
      }
    }

    // Final progress update
    if (setProgress && uploadId) {
      setProgress({
        id: uploadId,
        fileName: filename,
        progress: 100,
        status: 'complete'
      });
    }

    return {
      id,
      success: true
    };
  } catch (error) {
    console.error("Error in uploadDocument:", error);
    
    // Update progress with error if callback exists
    if (setProgress) {
      setProgress({
        id: uuidv4(),
        fileName: filename,
        progress: 0,
        status: 'error',
        message: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    // Log the error
    await supabase.from("processing_logs").insert({
      document_id: id,
      action: "upload",
      status: "error",
      message: errorMessage
    });

    return {
      id,
      success: false,
      error: errorMessage
    };
  }
}

export async function getDocumentById(documentId: string): Promise<Document | null> {
  if (!documentId) return null;

  try {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (error) {
      console.error("Error fetching document:", error.message);
      return null;
    }

    if (!data) return null;

    // Map from database schema to frontend Document type
    const document: Document = {
      id: data.id,
      name: data.name,
      type: data.type as "pdf" | "image",
      status: data.status as "uploaded" | "processing" | "processed" | "failed",
      url: data.original_url || "",
      thumbnails: [],
      pageCount: data.page_count || 0,
      transcription: data.transcription || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      userId: data.user_id,
      organizationId: data.user_id, // Use user_id as organization for now
      pipelineId: data.pipeline_id
    };

    // Get document pages
    const { data: pages, error: pagesError } = await supabase
      .from("document_pages")
      .select("*")
      .eq("document_id", documentId)
      .order("page_number", { ascending: true });

    if (!pagesError && pages && pages.length > 0) {
      document.thumbnails = pages.map(page => page.image_url);
    }

    return document;
  } catch (error) {
    console.error("Error in getDocumentById:", error);
    return null;
  }
}

export async function getDocumentPages(documentId: string): Promise<any[]> {
  if (!documentId) return [];

  try {
    const { data, error } = await supabase
      .from("document_pages")
      .select("*")
      .eq("document_id", documentId)
      .order("page_number", { ascending: true });

    if (error) {
      console.error("Error fetching document pages:", error.message);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error in getDocumentPages:", error);
    return [];
  }
}

export async function transcribeDocument(documentId: string): Promise<string | null> {
  if (!documentId) return null;

  try {
    // Get the document pages and combine their text content
    const { data: pages, error: pagesError } = await supabase
      .from("document_pages")
      .select("text_content")
      .eq("document_id", documentId)
      .order("page_number", { ascending: true });

    if (pagesError) {
      throw new Error(`Failed to fetch document pages: ${pagesError.message}`);
    }

    // Combine all page text contents
    const transcription = pages
      .map(page => page.text_content)
      .filter(Boolean)
      .join("\n\n");

    // Update the document with the transcription
    const { error: updateError } = await supabase
      .from("documents")
      .update({
        transcription: transcription,
        status: "processed"
      })
      .eq("id", documentId);

    if (updateError) {
      throw new Error(`Failed to update document with transcription: ${updateError.message}`);
    }

    // Log the successful transcription
    await supabase.from("processing_logs").insert({
      document_id: documentId,
      action: "transcribe",
      status: "success",
      message: "Document transcribed successfully"
    });

    return transcription;
  } catch (error) {
    console.error("Error in transcribeDocument:", error);
    
    // Log the error
    await supabase.from("processing_logs").insert({
      document_id: documentId,
      action: "transcribe", 
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error in transcription"
    });
    
    return null;
  }
}

export async function generateSchema(documentIds: string[]): Promise<any | null> {
  if (!documentIds || documentIds.length === 0) return null;

  try {
    // Call the process-document edge function with the generateSchema operation
    const response = await supabase.functions.invoke('process-document', {
      body: { 
        documentId: documentIds[0], // Primary document for logs
        documentIds, // All documents for schema generation
        operation: 'generateSchema' 
      }
    });

    if (!response.data.success) {
      throw new Error(response.data.error || "Unknown error in schema generation");
    }

    return response.data.result || null;
  } catch (error) {
    console.error("Error in generateSchema:", error);
    return null;
  }
}

export async function extractDocumentData(documentId: string, schemaId: string): Promise<any | null> {
  if (!documentId || !schemaId) return null;

  try {
    // Call the process-document edge function with the extractData operation
    const response = await supabase.functions.invoke('process-document', {
      body: { 
        documentId, 
        schemaId,
        operation: 'extractData' 
      }
    });

    if (!response.data.success) {
      throw new Error(response.data.error || "Unknown error in data extraction");
    }

    return response.data.result || null;
  } catch (error) {
    console.error("Error in extractDocumentData:", error);
    return null;
  }
}

export function extractTableData(documentId: string): Record<string, Record<string, string>> {
  // This is a mock function that will later be replaced by actual data from the database
  return {
    "Document Information": {
      "document_id": "DOC-12345",
      "document_name": "Sample Invoice",
      "upload_date": "2023-06-15",
      "page_count": "3"
    },
    "Invoice Details": {
      "invoice_number": "INV-001",
      "date": "2023-06-01",
      "due_date": "2023-07-01",
      "total_amount": "$1,250.00"
    },
    "Customer Information": {
      "name": "Acme Corporation",
      "contact": "John Doe",
      "email": "john@acmecorp.com",
      "phone": "(555) 123-4567"
    }
  };
}
