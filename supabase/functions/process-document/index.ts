
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not set");
      throw new Error("API key for document processing not found");
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set");
      throw new Error("Supabase configuration is missing");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const requestData = await req.json();
    const { documentId, operation } = requestData;

    if (!documentId) {
      throw new Error("Document ID is required");
    }

    if (!operation) {
      throw new Error("Operation type is required (transcribe, generateSchema, extractData)");
    }

    console.log(`Processing document with ID: ${documentId}, operation: ${operation}`);

    // Get document from database
    const { data: document, error: documentError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (documentError) {
      console.error("Error fetching document:", documentError);
      throw new Error(`Failed to fetch document: ${documentError.message}`);
    }

    // Log processing start
    await supabase.from("processing_logs").insert({
      document_id: documentId,
      action: `${operation} Started`,
      status: "success",
      message: `Document ${operation} started`,
    });

    // Update document status to processing
    await supabase
      .from("documents")
      .update({
        status: "processing",
        processing_progress: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId);

    // Get document pages with their image URLs
    const { data: pages, error: pagesError } = await supabase
      .from("document_pages")
      .select("*")
      .eq("document_id", documentId)
      .order("page_number", { ascending: true });

    if (pagesError) {
      console.error("Error fetching document pages:", pagesError);
      throw new Error(`Failed to fetch document pages: ${pagesError.message}`);
    }

    if (!pages || pages.length === 0) {
      throw new Error("No pages found for this document");
    }

    // Different operations based on the request
    let result;
    if (operation === "transcribe") {
      result = await transcribeDocument(document, pages, GEMINI_API_KEY, supabase);
    } else if (operation === "generateSchema") {
      // For schema generation, we may need multiple documents
      const { documentIds } = requestData;
      if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
        throw new Error("DocumentIds array is required for schema generation");
      }
      result = await generateSchema(documentIds, GEMINI_API_KEY, supabase);
    } else if (operation === "extractData") {
      const { schemaId } = requestData;
      if (!schemaId) {
        throw new Error("SchemaId is required for data extraction");
      }
      result = await extractDocumentData(document, pages, schemaId, GEMINI_API_KEY, supabase);
    } else {
      throw new Error(`Unknown operation: ${operation}`);
    }

    // Update document status to processed
    await supabase
      .from("documents")
      .update({
        status: "processed",
        processing_progress: 100,
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId);

    // Log processing completion
    await supabase.from("processing_logs").insert({
      document_id: documentId,
      action: `${operation} Completed`,
      status: "success",
      message: `Document ${operation} completed successfully`,
    });

    console.log(`Document processing (${operation}) completed for ID: ${documentId}`);
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Document ${operation} completed successfully`,
        result
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error processing document:", error);
    
    // Try to log the error to the processing_logs table
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        const body = await req.json().catch(() => ({}));
        const documentId = body.documentId;
        
        if (documentId) {
          await supabase.from("processing_logs").insert({
            document_id: documentId,
            action: "Processing Error",
            status: "error",
            message: error.message || "Unknown error occurred",
          });
          
          await supabase
            .from("documents")
            .update({
              status: "failed",
              processing_error: error.message || "Unknown error occurred",
              updated_at: new Date().toISOString(),
            })
            .eq("id", documentId);
        }
      }
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "An unknown error occurred" 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

// Function to transcribe a document using Gemini
async function transcribeDocument(document, pages, apiKey, supabase) {
  console.log("Starting document transcription using Gemini API");
  
  // Prepare image parts for the Gemini model
  const imageParts = await Promise.all(pages.map(async (page) => {
    // Get image data
    const imageUrl = page.image_url;
    const response = await fetch(imageUrl);
    const imageBlob = await response.blob();
    
    // Convert blob to base64
    const buffer = await imageBlob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    
    return {
      inlineData: {
        mimeType: "image/png",
        data: base64
      }
    };
  }));
  
  // Update progress to indicate preparation complete
  await supabase
    .from("documents")
    .update({
      processing_progress: 20,
      updated_at: new Date().toISOString(),
    })
    .eq("id", document.id);
  
  // Log start of Gemini processing
  await supabase.from("processing_logs").insert({
    document_id: document.id,
    action: "Gemini Transcription",
    status: "success",
    message: "Starting Gemini API transcription process",
  });
  
  // Build the Gemini prompt for transcription
  const prompt = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Please carefully examine the provided document images. This is a document that contains important information. 
            
Transcribe ALL the text content from these images into a clear, well-formatted markdown document. 
            
Important instructions:
1. Maintain the original structure of the document as much as possible.
2. Use headers (## and ###) to represent section titles and subtitles.
3. Use lists (- or numbered) for items that appear in list format.
4. Preserve the relationships between questions and answers.
5. If handwriting is unclear, indicate with [illegible] but make your best guess if possible.
6. Include ALL text content, including headers, footers, and any notes.

The output should be a complete, accurate transcription that could be used as a text-only reference for the original document.`
          },
          ...imageParts
        ]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 4096,
    }
  };
  
  // Call Gemini API
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=" + apiKey, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(prompt),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini API error:", errorText);
    throw new Error(`Gemini API returned error: ${response.status} ${response.statusText}`);
  }
  
  const result = await response.json();
  
  if (!result.candidates || result.candidates.length === 0 || !result.candidates[0].content) {
    throw new Error("Gemini API returned no content");
  }
  
  // Extract the transcription text
  const transcription = result.candidates[0].content.parts[0].text;
  
  // Update the document with the transcription
  await supabase
    .from("documents")
    .update({
      transcription: transcription,
      processing_progress: 100,
      updated_at: new Date().toISOString(),
    })
    .eq("id", document.id);
  
  // Log completion
  await supabase.from("processing_logs").insert({
    document_id: document.id,
    action: "Gemini Transcription Complete",
    status: "success",
    message: "Successfully transcribed document using Gemini API",
  });
  
  return { transcription };
}

// Function to generate a schema for multiple documents
async function generateSchema(documentIds, apiKey, supabase) {
  console.log("Starting schema generation using Gemini API");
  
  // Fetch all documents
  const { data: documents, error: documentsError } = await supabase
    .from("documents")
    .select("*")
    .in("id", documentIds);
  
  if (documentsError) {
    throw new Error(`Failed to fetch documents: ${documentsError.message}`);
  }
  
  if (!documents || documents.length === 0) {
    throw new Error("No documents found with the provided IDs");
  }
  
  // Get all transcriptions
  const transcriptions = documents.map(doc => {
    return {
      id: doc.id,
      name: doc.name,
      transcription: doc.transcription || "No transcription available"
    };
  });
  
  // Update progress for all documents
  await Promise.all(documentIds.map(id => 
    supabase
      .from("documents")
      .update({
        processing_progress: 50,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
  ));
  
  // Log start of Gemini processing
  await Promise.all(documentIds.map(id => 
    supabase.from("processing_logs").insert({
      document_id: id,
      action: "Gemini Schema Generation",
      status: "success",
      message: "Starting Gemini API schema generation process",
    })
  ));
  
  // Build the Gemini prompt for schema generation
  const transcriptionText = transcriptions.map(t => 
    `Document: ${t.name}\n\nTranscription:\n${t.transcription}\n\n---\n\n`
  ).join('');
  
  const prompt = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Analyze the provided transcriptions of documents. I need you to design a data schema that can efficiently capture ALL information from these documents. 

Create a structured schema with tables and fields that would work for extracting data from these and similar documents.

Important requirements:
1. Each logical section of the documents should be a separate table.
2. Fields should capture specific data points with appropriate types (string, number, boolean, date, enum).
3. Mark fields as required when they are critical for the document's purpose.
4. Include a rationale explaining your design decisions.
5. Suggest 3-5 potential improvements to make the schema more robust.

Return your response as a JSON object with this structure:
{
  "schema": {
    "name": "Schema name",
    "description": "Brief description",
    "tables": [
      {
        "name": "TableName",
        "description": "Table purpose",
        "fields": [
          { 
            "name": "FieldName", 
            "type": "string|number|boolean|date|enum", 
            "required": true|false,
            "enumValues": ["value1", "value2"] // Only for enum types
          }
        ]
      }
    ],
    "rationale": "Detailed explanation of schema design choices",
    "suggestions": [
      {
        "description": "Suggestion description",
        "type": "add|modify|remove",
        "impact": "Explanation of the benefit"
      }
    ]
  }
}

Here are the document transcriptions to analyze:

${transcriptionText}`
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 4096,
    }
  };
  
  // Call Gemini API
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=" + apiKey, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(prompt),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini API error:", errorText);
    throw new Error(`Gemini API returned error: ${response.status} ${response.statusText}`);
  }
  
  const result = await response.json();
  
  if (!result.candidates || result.candidates.length === 0 || !result.candidates[0].content) {
    throw new Error("Gemini API returned no content");
  }
  
  // Extract the schema JSON
  const schemaText = result.candidates[0].content.parts[0].text;
  
  // Parse the JSON from the text response
  let schema;
  try {
    // The model might return the JSON with markdown code blocks, so we need to clean it
    const jsonString = schemaText.replace(/```json|```/g, '').trim();
    schema = JSON.parse(jsonString);
  } catch (error) {
    console.error("Error parsing schema JSON:", error, schemaText);
    throw new Error("Failed to parse schema JSON from Gemini response");
  }
  
  // Update progress for all documents
  await Promise.all(documentIds.map(id => 
    supabase
      .from("documents")
      .update({
        processing_progress: 100,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
  ));
  
  // Log completion
  await Promise.all(documentIds.map(id => 
    supabase.from("processing_logs").insert({
      document_id: id,
      action: "Gemini Schema Generation Complete",
      status: "success",
      message: "Successfully generated schema using Gemini API",
    })
  ));
  
  return schema;
}

// Function to extract data from a document based on a schema
async function extractDocumentData(document, pages, schemaId, apiKey, supabase) {
  console.log("Starting data extraction using Gemini API");
  
  // Get the schema
  const { data: schema, error: schemaError } = await supabase
    .from("document_schemas")
    .select("*")
    .eq("id", schemaId)
    .single();
  
  if (schemaError) {
    throw new Error(`Failed to fetch schema: ${schemaError.message}`);
  }
  
  if (!schema) {
    throw new Error("Schema not found with the provided ID");
  }
  
  // Prepare image parts for the Gemini model
  const imageParts = await Promise.all(pages.map(async (page) => {
    // Get image data
    const imageUrl = page.image_url;
    const response = await fetch(imageUrl);
    const imageBlob = await response.blob();
    
    // Convert blob to base64
    const buffer = await imageBlob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    
    return {
      inlineData: {
        mimeType: "image/png",
        data: base64
      }
    };
  }));
  
  // Update progress to indicate preparation complete
  await supabase
    .from("documents")
    .update({
      processing_progress: 30,
      updated_at: new Date().toISOString(),
    })
    .eq("id", document.id);
  
  // Log start of Gemini processing
  await supabase.from("processing_logs").insert({
    document_id: document.id,
    action: "Gemini Data Extraction",
    status: "success",
    message: "Starting Gemini API data extraction process",
  });
  
  // Build the Gemini prompt for data extraction
  const schemaJSON = JSON.stringify(schema.structure, null, 2);
  
  const promptParts = [
    {
      text: `Extract structured data from the provided document images according to the following schema. 

Schema structure:
${schemaJSON}

Instructions:
1. Extract all relevant data from the document that matches the schema.
2. For each field in each table, provide the corresponding value from the document.
3. If a piece of information is not present in the document, use null.
4. If handwriting is unclear, make your best guess and indicate confidence level.
5. Return data in a structured JSON format matching the schema tables and fields.

Return your response as a JSON object with this structure:
{
  "extractedData": {
    "TableName1": {
      "FieldName1": "extracted value",
      "FieldName2": "extracted value"
    },
    "TableName2": {
      "FieldName1": "extracted value",
      "FieldName2": "extracted value"
    }
  },
  "confidence": 0.95, // Overall confidence in extraction accuracy (0-1)
  "processingTime": "X seconds"
}`
    },
    ...imageParts
  ];
  
  const prompt = {
    contents: [
      {
        role: "user",
        parts: promptParts
      }
    ],
    generationConfig: {
      temperature: 0.2,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 4096,
    }
  };
  
  // Call Gemini API
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=" + apiKey, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(prompt),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini API error:", errorText);
    throw new Error(`Gemini API returned error: ${response.status} ${response.statusText}`);
  }
  
  const result = await response.json();
  
  if (!result.candidates || result.candidates.length === 0 || !result.candidates[0].content) {
    throw new Error("Gemini API returned no content");
  }
  
  // Extract the data JSON
  const dataText = result.candidates[0].content.parts[0].text;
  
  // Parse the JSON from the text response
  let extractedData;
  try {
    // The model might return the JSON with markdown code blocks, so we need to clean it
    const jsonString = dataText.replace(/```json|```/g, '').trim();
    extractedData = JSON.parse(jsonString);
  } catch (error) {
    console.error("Error parsing extracted data JSON:", error, dataText);
    throw new Error("Failed to parse extracted data JSON from Gemini response");
  }
  
  // For each table and field in the extracted data, save to document_data table
  const { extractedData: tables, confidence } = extractedData;
  
  for (const tableName in tables) {
    const tableData = tables[tableName];
    const table = schema.structure.find(t => t.name === tableName);
    
    if (table) {
      for (const fieldName in tableData) {
        const field = table.fields.find(f => f.name === fieldName);
        
        if (field) {
          await supabase.from("document_data").insert({
            document_id: document.id,
            table_id: table.id,
            field_id: field.id,
            value: tableData[fieldName],
            confidence: confidence
          });
        }
      }
    }
  }
  
  // Update progress
  await supabase
    .from("documents")
    .update({
      processing_progress: 100,
      updated_at: new Date().toISOString(),
    })
    .eq("id", document.id);
  
  // Log completion
  await supabase.from("processing_logs").insert({
    document_id: document.id,
    action: "Gemini Data Extraction Complete",
    status: "success",
    message: "Successfully extracted document data using Gemini API",
  });
  
  return extractedData;
}
