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
    // Check for duplicates before uploading
    const { data: existingDocs, error: queryError } = await supabase
      .from("documents")
      .select("id, name, size")
      .eq("user_id", userId)
      .eq("name", filename);
    
    if (queryError) {
      console.error("Error checking for duplicates:", queryError);
    } else if (existingDocs && existingDocs.length > 0) {
      // Check if size matches too for extra verification
      const potentialDuplicate = existingDocs.find(doc => 
        doc.size === file.size || Math.abs(doc.size - file.size) < 100 // Allow small difference in size
      );
      
      if (potentialDuplicate) {
        return {
          id: potentialDuplicate.id,
          success: true,
          error: "Document already exists and was selected instead of uploading a duplicate."
        };
      }
    }

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

        if (!response.data || !response.data.success) {
          throw new Error(response.data?.error || "Unknown error in PDF conversion");
        }

        // Make sure we're using the actual page count from the PDF processor
        const actualPageCount = response.data.pageCount || 0;
        
        // Update progress with page information
        if (setProgress && uploadId) {
          setProgress({
            id: uploadId,
            fileName: filename,
            progress: 90,
            status: 'processing',
            message: `Processed ${actualPageCount} pages`,
            pageCount: actualPageCount,
            pagesProcessed: actualPageCount
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

export async function getProcessingLogs(documentId: string): Promise<ProcessingLog[]> {
  if (!documentId) return [];

  try {
    const { data, error } = await supabase
      .from("processing_logs")
      .select("*")
      .eq("document_id", documentId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching processing logs:", error.message);
      return [];
    }

    // Type check and cast to ensure status is one of the allowed values
    return (data || []).map(item => {
      // Validate status to ensure it matches the ProcessingLog interface
      let validStatus: "success" | "error" | "warning" = "error";
      if (item.status === "success" || item.status === "warning") {
        validStatus = item.status;
      }
      
      return {
        id: item.id,
        document_id: item.document_id,
        action: item.action,
        status: validStatus,
        message: item.message || "",
        created_at: item.created_at
      } as ProcessingLog;
    });
  } catch (error) {
    console.error("Error in getProcessingLogs:", error);
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
    console.log("Calling process-document edge function with documentIds:", documentIds);
    
    // Call the process-document edge function with the generateSchema operation
    const response = await supabase.functions.invoke('process-document', {
      body: { 
        documentId: documentIds[0], // Primary document for logs
        documentIds, // All documents for schema generation
        operation: 'generateSchema' 
      }
    });

    console.log("Schema generation response:", response);
    
    if (!response.data) {
      console.error("No response data received from schema generation");
      throw new Error("No response received from schema generation function");
    }
    
    if (!response.data.success) {
      const errorMsg = response.data.error || "Unknown error in schema generation";
      console.error("Schema generation error:", errorMsg);
      throw new Error(errorMsg);
    }

    return response.data.result || null;
  } catch (error) {
    console.error("Error in generateSchema:", error);
    throw error; // Re-throw to allow proper error handling upstream
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

    // Enhanced error handling
    if (!response || !response.data) {
      console.error("No response received from data extraction");
      throw new Error("No response received from data extraction");
    }

    if (!response.data.success) {
      const errorMessage = response.data.error || "Unknown error in data extraction";
      console.error("Data extraction error:", errorMessage);
      throw new Error(errorMessage);
    }

    return response.data.result || null;
  } catch (error) {
    console.error("Error in extractDocumentData:", error);
    // Re-throw to propagate the error for proper handling
    throw error;
  }
}

export function extractTableData(documentId: string): Record<string, Record<string, string>> {
  // This is a helper function to transform the extracted data into a more usable format for the UI
  // In a real implementation, this would fetch data from the database
  // For now, returning mock data for demonstration purposes
  return {
    "Invoice": {
      "Invoice Number": "INV-2023-001",
      "Date": "2023-05-15",
      "Due Date": "2023-06-15",
      "Total Amount": "$1,250.00"
    },
    "Customer": {
      "Name": "Acme Corporation",
      "Address": "123 Business Ave, Suite 100",
      "City": "San Francisco",
      "State": "CA",
      "ZIP": "94107",
      "Contact": "John Smith"
    },
    "Items": {
      "Item 1": "Professional Services",
      "Description": "Consulting - 10 hours",
      "Quantity": "10",
      "Rate": "$125.00",
      "Amount": "$1,250.00"
    }
  };
}

export function getExtractedData(documentId: string): Promise<DocumentData[]> {
  return new Promise(async (resolve, reject) => {
    try {
      const { data, error } = await supabase
        .from("document_data")
        .select("*")
        .eq("document_id", documentId);
        
      if (error) {
        console.error("Error fetching document data:", error);
        throw error;
      }
      
      const formattedData: DocumentData[] = (data || []).map(item => ({
        id: item.id,
        documentId: item.document_id,
        tableId: item.table_id,
        fieldId: item.field_id,
        value: item.value || "",
        confidence: item.confidence || 0,
        createdAt: item.created_at,
        updatedAt: item.created_at // Use created_at as updatedAt since it's not in the database
      }));
      
      resolve(formattedData);
    } catch (error) {
      console.error("Error in getExtractedData:", error);
      reject(error);
    }
  });
}
