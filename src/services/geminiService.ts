import { GeminiPrompt } from "@/types";
import { supabase } from "@/integrations/supabase/client";

// Check if a document with the same name and size already exists
export const checkDuplicateDocument = async (name: string, size: number, userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from("documents")
      .select("id")
      .eq("name", name)
      .eq("size", size)
      .eq("user_id", userId)
      .eq("status", "processed") // Only consider processed documents as duplicates
      .limit(1);
      
    if (error) {
      console.error("Error checking for duplicate document:", error);
      return false; // Proceed with upload if error checking for duplicates
    }
    
    return data && data.length > 0;
  } catch (error) {
    console.error("Error in duplicate document check:", error);
    return false; // Proceed with upload if error checking for duplicates
  }
};

// Store prompts for later retrieval
export const storePromptForDocument = async (documentId: string, promptType: string, promptText: string): Promise<void> => {
  try {
    await supabase
      .from("document_prompts")
      .insert({
        document_id: documentId,
        prompt_type: promptType,
        prompt_text: promptText,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error("Error storing prompt:", error);
  }
};

// Retrieve prompts for a document
export const getPromptsForDocument = async (documentId: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from("document_prompts")
      .select("*")
      .eq("document_id", documentId)
      .order("created_at", { ascending: false });
      
    if (error) {
      console.error("Error fetching prompts:", error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error("Error retrieving prompts:", error);
    return [];
  }
};

// Process prompt with Gemini using our edge function
export const processWithGemini = async (prompt: GeminiPrompt): Promise<string> => {
  console.log("Processing with Gemini:", prompt);
  
  try {
    // Determine the operation based on the prompt
    let operation = 'transcribe';
    let endpoint = 'process-document';
    let body: any = {};
    
    if (prompt.prompt.includes("transcribe")) {
      operation = 'transcribe';
      body = {
        documentId: prompt.documentId,
        operation,
        model: "gemini-2.0-flash-lite",  // Updated to the latest model
        includeImages: prompt.includeImages,
        prompt: prompt.prompt
      };
      console.log("Using Gemini 2.0 Flash Lite for transcription");
      
      // Store the transcription prompt
      await storePromptForDocument(prompt.documentId, "transcription", prompt.prompt);
    } else if (prompt.prompt.includes("schema")) {
      operation = 'generateSchema';
      body = {
        documentId: prompt.documentId,
        documentIds: prompt.documentIds || [prompt.documentId],
        operation,
        model: "gemini-2.0-flash-lite",  // Updated to the latest model
        includeTranscription: prompt.includeTranscription
      };
      
      // Store the schema generation prompt
      if (prompt.documentIds && prompt.documentIds.length > 0) {
        for (const docId of prompt.documentIds) {
          await storePromptForDocument(docId, "schema_generation", prompt.prompt);
        }
        
        try {
          await createPipelineForDocuments(prompt.documentIds);
        } catch (pipelineError) {
          console.error("Error creating pipeline:", pipelineError);
          // Continue with schema generation even if pipeline creation fails
        }
      } else {
        await storePromptForDocument(prompt.documentId, "schema_generation", prompt.prompt);
      }
    } else if (prompt.prompt.includes("extract data")) {
      operation = 'extractData';
      body = {
        documentId: prompt.documentId,
        schemaId: prompt.schemaId,
        operation,
        model: "gemini-2.0-flash-lite",  // Updated to the latest model
        includeImages: prompt.includeImages
      };
      
      // Store the data extraction prompt
      await storePromptForDocument(prompt.documentId, "data_extraction", prompt.prompt);
    }
    
    console.log(`Calling edge function ${endpoint} with operation ${operation}`, body);
    
    // Call the edge function
    const response = await supabase.functions.invoke(endpoint, { 
      body,
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    // Log the full response for debugging
    console.log("Full response from edge function:", JSON.stringify(response, null, 2));
    
    // Improved error handling - check for null response
    if (!response || !response.data) {
      console.error(`No response received from ${operation}`);
      throw new Error(`No response received from ${operation}`);
    }
    
    if (!response.data.success) {
      const errorObj = response.data;
      console.error(`Error in ${operation}:`, errorObj);
      
      // Create a more detailed error message
      const errorMessage = errorObj.error || `Unknown error in ${operation}`;
      const errorDetails = errorObj.errorName ? `${errorObj.errorName}: ${errorMessage}` : errorMessage;
      const fullErrorInfo = errorObj.errorStack ? `${errorDetails}\n${errorObj.errorStack}` : errorDetails;
      
      // Store error details
      await storePromptForDocument(prompt.documentId, "error", fullErrorInfo);
      
      throw new Error(fullErrorInfo);
    }
    
    console.log(`Received successful response from ${operation}`, response.data);
    
    // Return the result based on the operation
    if (operation === 'transcribe') {
      return response.data.result.transcription;
    } else if (operation === 'generateSchema') {
      return JSON.stringify(response.data.result, null, 2);
    } else if (operation === 'extractData') {
      return JSON.stringify(response.data.result, null, 2);
    }
    
    return "Processing complete";
  } catch (error) {
    console.error("Error processing with Gemini:", error);
    throw error;
  }
};

// Create a pipeline for a set of documents
export const createPipelineForDocuments = async (documentIds: string[]): Promise<any> => {
  try {
    console.log("Creating pipeline for documents:", documentIds);
    
    const response = await supabase.functions.invoke('pipeline-metadata', {
      body: { documentIds }
    });
    
    if (!response || !response.data) {
      console.error("No response received from pipeline-metadata function");
      throw new Error("No response received from pipeline-metadata function");
    }
    
    if (response.data.error) {
      console.error("Error creating pipeline:", response.data.error);
      throw new Error(response.data.error);
    }
    
    console.log("Pipeline created successfully:", response.data.pipeline);
    return response.data.pipeline;
  } catch (error) {
    console.error("Error creating pipeline:", error);
    throw error;
  }
};

export const buildTranscriptionPrompt = (document: any): GeminiPrompt => {
  return {
    documentId: document.id,
    prompt: `Please carefully examine the provided document images. This is a document that contains important information. 
    
Transcribe ALL the text content from these images into a clear, well-formatted markdown document. 
    
Important instructions:
1. Maintain the original structure of the document as much as possible.
2. Use headers (## and ###) to represent section titles and subtitles.
3. Use lists (- or numbered) for items that appear in list format.
4. Preserve the relationships between questions and answers.
5. If handwriting is unclear, indicate with [illegible] but make your best guess if possible.
6. Include ALL text content, including headers, footers, and any notes.
7. Properly format any tables you find using markdown table syntax.

The output should be a complete, accurate transcription that could be used as a text-only reference for the original document.`,
    includeImages: true,
    includeTranscription: false
  };
};

export const buildSchemaGenerationPrompt = (documents: any[]): GeminiPrompt => {
  return {
    documentIds: documents.map(doc => doc.id),
    prompt: `Analyze the provided transcriptions of documents. I need you to design a data schema that can efficiently capture ALL information from these documents. 

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
}`,
    includeTranscription: true
  };
};

export const buildDataExtractionPrompt = (document: any, schema: any): GeminiPrompt => {
  return {
    documentId: document.id,
    schemaId: schema.id,
    prompt: `Extract structured data from the provided document images according to the following schema. 

Schema structure:
${JSON.stringify(schema.structure, null, 2)}

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
}`,
    includeImages: true,
    includeTranscription: false
  };
};
