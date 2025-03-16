
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

    // Upload the file
    const { error: uploadError } = await supabase.storage
      .from("documents")
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

    // Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from("documents")
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

    return {
      id,
      success: true
    };
  } catch (error) {
    console.error("Error in uploadDocument:", error);
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
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      userId: data.user_id,
      organizationId: "default", // Default organization ID since it's required
    };

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

export function extractTableData(documentId: string): Record<string, Record<string, string>> {
  // This is a mock function that will later be implemented to extract actual table data
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
