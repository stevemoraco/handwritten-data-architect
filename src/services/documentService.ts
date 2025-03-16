
import { supabase } from "@/integrations/supabase/client";
import { Document, SchemaTable } from "@/types";

// Upload a document to Supabase storage
export const uploadDocument = async (
  file: File,
  userId: string,
  onProgress?: (progress: number) => void
): Promise<{ documentId: string; url: string }> => {
  console.log(`Starting upload for ${file.name}`);
  
  // Create document record in the database
  const { data: document, error: documentError } = await supabase
    .from("documents")
    .insert({
      name: file.name,
      type: file.type,
      status: "uploading",
      user_id: userId,
      size: file.size
    })
    .select()
    .single();
  
  if (documentError) {
    console.error("Error creating document record:", documentError);
    throw new Error(`Failed to create document record: ${documentError.message}`);
  }
  
  if (!document) {
    throw new Error("Document record not created");
  }
  
  // Upload file to storage
  const filePath = `${userId}/${document.id}/${file.name}`;
  
  const { error: uploadError } = await supabase.storage
    .from("document_files")
    .upload(filePath, file, {
      onUploadProgress: (progress) => {
        const percent = Math.round((progress.loaded / progress.total) * 100);
        if (onProgress) {
          onProgress(percent);
        }
        console.log(`Upload progress for ${file.name}: ${percent}%`);
      }
    });
  
  if (uploadError) {
    console.error("Error uploading file:", uploadError);
    
    // Update document status to failed
    await supabase
      .from("documents")
      .update({
        status: "failed",
        processing_error: uploadError.message,
        updated_at: new Date().toISOString()
      })
      .eq("id", document.id);
    
    throw new Error(`Failed to upload file: ${uploadError.message}`);
  }
  
  // Get the public URL for the file
  const { data: publicURL } = supabase.storage
    .from("document_files")
    .getPublicUrl(filePath);
  
  // Update document status and URL
  await supabase
    .from("documents")
    .update({
      status: "uploaded",
      original_url: publicURL.publicUrl,
      updated_at: new Date().toISOString()
    })
    .eq("id", document.id);
  
  console.log(`File uploaded successfully: ${file.name}, ID: ${document.id}`);
  
  return {
    documentId: document.id,
    url: publicURL.publicUrl
  };
};

// Process a document (convert to images, extract text)
export const processDocument = async (documentId: string): Promise<void> => {
  console.log(`Processing document with ID: ${documentId}`);
  
  try {
    // Call the document processing edge function
    const { data, error } = await supabase.functions
      .invoke("process-document", {
        body: { documentId }
      });
    
    if (error) {
      console.error("Error processing document:", error);
      throw new Error(`Document processing failed: ${error.message}`);
    }
    
    console.log("Processing result:", data);
  } catch (error) {
    console.error("Error processing document:", error);
    throw error;
  }
};

// Convert PDF to images
export const convertPdfToImages = async (documentId: string): Promise<any> => {
  console.log(`Converting PDF to images for document ID: ${documentId}`);
  
  try {
    // Call the PDF to images edge function
    const { data, error } = await supabase.functions
      .invoke("pdf-to-images", {
        body: { documentId }
      });
    
    if (error) {
      console.error("Error converting PDF to images:", error);
      throw new Error(`PDF conversion failed: ${error.message}`);
    }
    
    console.log("Conversion result:", data);
    return data.pages;
  } catch (error) {
    console.error("Error converting PDF to images:", error);
    throw error;
  }
};

// Get document by ID
export const getDocumentById = async (documentId: string): Promise<Document> => {
  console.log(`Fetching document with ID: ${documentId}`);
  
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .single();
  
  if (error) {
    console.error("Error fetching document:", error);
    throw new Error(`Failed to fetch document: ${error.message}`);
  }
  
  if (!data) {
    throw new Error("Document not found");
  }
  
  return data as Document;
};

// Get pages for a document
export const getDocumentPages = async (documentId: string) => {
  console.log(`Fetching pages for document ID: ${documentId}`);
  
  const { data, error } = await supabase
    .from("document_pages")
    .select("*")
    .eq("document_id", documentId)
    .order("page_number", { ascending: true });
  
  if (error) {
    console.error("Error fetching document pages:", error);
    throw new Error(`Failed to fetch document pages: ${error.message}`);
  }
  
  return data || [];
};

// Get processing logs for a document
export const getDocumentLogs = async (documentId: string) => {
  console.log(`Fetching logs for document ID: ${documentId}`);
  
  const { data, error } = await supabase
    .from("processing_logs")
    .select("*")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false });
  
  if (error) {
    console.error("Error fetching document logs:", error);
    throw new Error(`Failed to fetch document logs: ${error.message}`);
  }
  
  return data || [];
};

// Generate transcription prompt for Gemini
export const generateTranscriptionPrompt = (imageUrls: string[]): string => {
  return `
You are an expert assistant helping to digitize handwritten documents. 
I've provided images of a handwritten document. Please carefully analyze these images and provide a complete transcription of all visible content.

Guidelines:
1. Maintain the document's structure (sections, tables, bullet points)
2. Transcribe ALL text visible in the images
3. If handwriting is unclear, indicate with [unclear: best guess]
4. Convert the content into properly formatted markdown
5. Include section headers, question numbers, and maintain the hierarchical structure
6. Be particularly careful with names, dates, numerical values, and medical terminology
7. Transcribe checkboxes as [x] for checked and [ ] for unchecked

Please process the complete document page by page, maintaining all visible information.
`;
};

export const generateSchemaPrompt = (documentTranscriptions: string[]): string => {
  return `
You are an expert data architect helping to design a database schema for digitizing handwritten documents.

I've provided transcriptions from multiple handwritten documents. Please analyze these documents and suggest an optimal database schema design that will:

1. Capture ALL information present across the documents
2. Accommodate variations in how the forms might be filled out
3. Use a well-normalized structure with appropriate relationships
4. Group related fields into logical tables
5. Ensure compatibility with standard data models where appropriate

Guidelines:
- Propose tables with clear names and descriptions
- For each table, define all necessary fields with appropriate data types
- Identify required vs optional fields
- For enumerated types, suggest possible values
- Consider scalability and flexibility for future additions
- Maintain data integrity across the schema

After presenting the schema, please provide:
1. A brief explanation of your design rationale
2. 5-10 specific suggestions for potential improvements or considerations
3. Any anticipated challenges when parsing the handwritten data into this schema

Output the schema in a structured, organized format suitable for database implementation.
`;
};

export const generateDataExtractionPrompt = (imageUrls: string[], schema: SchemaTable[]): string => {
  const schemaDescription = schema.map(table => {
    const fieldsDescription = table.fields.map(field => 
      `- ${field.name} (${field.type}${field.required ? ', required' : ''})${field.description ? ': ' + field.description : ''}`
    ).join('\n');
    
    return `## ${table.name}
${table.description}

Fields:
${fieldsDescription}`;
  }).join('\n\n');

  return `
You are an expert AI assistant analyzing images of handwritten documents.

Your task is to extract information from these documents according to the following database schema:

${schemaDescription}

Guidelines:
1. Extract all relevant information visible in the images
2. Format your response as structured data that matches the schema above
3. For each table, provide values for all fields where information is available
4. If information is unclear or missing, indicate with [unclear] or [missing]
5. Be particularly careful with names, dates, numerical values, and medical terms
6. For checkbox items, indicate whether they are checked or unchecked
7. Maintain the relationship between data items according to the schema

Please process the document and extract all relevant information according to the schema above.
`;
};
