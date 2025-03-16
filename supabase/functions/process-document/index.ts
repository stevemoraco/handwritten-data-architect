
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentId, documentIds, schemaId, operation, model = "gemini-2.0-flash-lite", includeImages = true, includeTranscription = false, prompt } = await req.json();
    
    console.log(`Processing document operation: ${operation}`, { documentId, documentIds, schemaId, model });
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Gemini API key
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error("Gemini API key not found");
    }

    try {
      // Log start of operation
      if (documentId) {
        await supabase
          .from('processing_logs')
          .insert({
            document_id: documentId,
            action: `Gemini ${operation}`,
            status: 'success',
            message: `Started ${operation} operation`
          });
      }

      let result;
      
      if (operation === 'transcribe') {
        result = await transcribeDocument(documentId, model, geminiApiKey, supabase, includeImages, prompt);
      } else if (operation === 'generateSchema') {
        result = await generateSchema(documentIds || [documentId], model, geminiApiKey, supabase, includeTranscription);
      } else if (operation === 'extractData') {
        result = await extractData(documentId, schemaId, model, geminiApiKey, supabase, includeImages);
      } else {
        throw new Error(`Unsupported operation: ${operation}`);
      }

      // Log completion of operation
      if (documentId) {
        await supabase
          .from('processing_logs')
          .insert({
            document_id: documentId,
            action: `Gemini ${operation}`,
            status: 'success',
            message: `Completed ${operation} operation`
          });
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          result,
          operation,
          documentId,
          schemaId: result?.id || schemaId
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    } catch (operationError) {
      console.error(`Error in ${operation} operation:`, operationError);
      
      // Enhanced error logging with complete error details
      const errorDetails = {
        message: operationError.message || "Unknown error",
        stack: operationError.stack,
        name: operationError.name,
        operation,
        documentId,
        schemaId,
        model,
        context: operationError.context || {},
        timestamp: new Date().toISOString()
      };
      
      console.error("FULL ERROR DETAILS:", JSON.stringify(errorDetails, null, 2));
      
      // Log error
      if (documentId) {
        await supabase
          .from('processing_logs')
          .insert({
            document_id: documentId,
            action: `Gemini ${operation}`,
            status: 'error',
            message: JSON.stringify(errorDetails)
          });
      }
      
      throw operationError;
    }
  } catch (error) {
    console.error("Error processing document:", error);
    
    // Enhanced error response with complete error details
    const detailedError = {
      success: false,
      error: error.message || "An unknown error occurred",
      errorName: error.name,
      errorStack: error.stack,
      errorContext: error.context || {},
      timestamp: new Date().toISOString()
    };
    
    console.error("DETAILED ERROR RESPONSE:", JSON.stringify(detailedError, null, 2));
    
    return new Response(
      JSON.stringify(detailedError),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 500
      }
    );
  }
});

async function transcribeDocument(documentId: string, model: string, apiKey: string, supabase: any, includeImages: boolean, customPrompt?: string) {
  console.log(`Transcribing document ${documentId} with model ${model}`);
  
  // Get document information
  const { data: document, error: docError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();
  
  if (docError || !document) {
    throw new Error(`Document not found: ${docError?.message || 'Unknown error'}`);
  }
  
  let context = "";
  let imageUrls: string[] = [];
  
  // Get document pages for images if needed
  if (includeImages) {
    const { data: pages, error: pagesError } = await supabase
      .from('document_pages')
      .select('*')
      .eq('document_id', documentId)
      .order('page_number', { ascending: true });
    
    if (pagesError) {
      console.error("Error fetching document pages:", pagesError);
    } else if (pages && pages.length > 0) {
      // Add page images to context
      imageUrls = pages.map(page => page.image_url).filter(Boolean);
      console.log(`Found ${imageUrls.length} page images for document ${documentId}`);
    }
  }
  
  // Build the prompt
  const systemPrompt = customPrompt || `Please carefully examine the provided document images. This is a document that contains important information. 
    
Transcribe ALL the text content from these images into a clear, well-formatted markdown document. 
    
Important instructions:
1. Maintain the original structure of the document as much as possible.
2. Use headers (## and ###) to represent section titles and subtitles.
3. Use lists (- or numbered) for items that appear in list format.
4. Preserve the relationships between questions and answers.
5. If handwriting is unclear, indicate with [illegible] but make your best guess if possible.
6. Include ALL text content, including headers, footers, and any notes.
7. Properly format any tables you find using markdown table syntax.

The output should be a complete, accurate transcription that could be used as a text-only reference for the original document.`;

  console.log("Sending transcription request to Gemini API", {
    modelUsed: model, 
    pageCount: imageUrls.length, 
    documentName: document.name
  });
  
  try {
    const startTime = Date.now();
    
    // Prepare request payload
    const payload: any = {
      contents: [
        {
          role: "user",
          parts: [
            { text: systemPrompt }
          ]
        }
      ],
      generation_config: {
        temperature: 0.1,
        top_p: 0.95,
        top_k: 40,
        max_output_tokens: 4096,
      }
    };
    
    // Add images to the parts if available
    if (imageUrls.length > 0) {
      for (const imageUrl of imageUrls) {
        try {
          // Fetch the image and convert to base64
          const imageResponse = await fetch(imageUrl);
          if (!imageResponse.ok) {
            console.error(`Failed to fetch image: ${imageUrl}`, imageResponse.status);
            continue;
          }
          
          const imageArrayBuffer = await imageResponse.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(imageArrayBuffer)));
          const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';
          
          payload.contents[0].parts.push({
            inline_data: {
              mime_type: mimeType,
              data: base64
            }
          });
          
          console.log(`Added image to request: ${imageUrl}`);
        } catch (imageError) {
          console.error(`Error processing image ${imageUrl}:`, imageError);
        }
      }
    }
    
    // Call Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error("Gemini API error response:", errorData);
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log("Gemini API response:", JSON.stringify(data).substring(0, 500) + "...");
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error("No response from Gemini API");
    }
    
    // Extract transcription from response
    const transcription = data.candidates[0].content.parts.map((part: any) => part.text).join("\n");
    const processingTime = Date.now() - startTime;
    
    console.log(`Transcription completed in ${processingTime}ms`);
    
    // Update document with transcription
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        transcription: transcription,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId);
    
    if (updateError) {
      console.error("Error updating document with transcription:", updateError);
    }
    
    return {
      transcription: transcription,
      processingTime: `${processingTime}ms`
    };
  } catch (error) {
    console.error("Error in transcribeDocument:", error);
    throw error;
  }
}

async function generateSchema(documentIds: string[], model: string, apiKey: string, supabase: any, includeTranscription: boolean) {
  console.log(`Generating schema for documents: ${documentIds.join(", ")}`);
  
  if (!documentIds.length) {
    throw new Error("No document IDs provided");
  }
  
  // Collect document information
  const { data: documents, error: docsError } = await supabase
    .from('documents')
    .select('*')
    .in('id', documentIds);
  
  if (docsError) {
    throw new Error(`Error fetching documents: ${docsError.message}`);
  }
  
  if (!documents || documents.length === 0) {
    throw new Error("No documents found");
  }
  
  console.log(`Found ${documents.length} documents for schema generation`);
  
  // Prepare context with document transcriptions
  let context = "";
  
  if (includeTranscription) {
    // Collect transcriptions from documents
    documents.forEach((doc: any, index: number) => {
      if (doc.transcription) {
        context += `DOCUMENT ${index + 1}: ${doc.name}\n\n${doc.transcription}\n\n---\n\n`;
      }
    });
  }
  
  // Build the prompt
  const prompt = `Analyze the provided transcriptions of documents. I need you to design a data schema that can efficiently capture ALL information from these documents. 

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
}`;

  // Call Gemini API
  const payload = {
    contents: [
      {
        role: "user",
        parts: []
      }
    ],
    generation_config: {
      temperature: 0.2,
      top_p: 0.95,
      top_k: 40,
      max_output_tokens: 8192,
    }
  };
  
  if (context) {
    payload.contents[0].parts.push({ text: context });
  }
  
  payload.contents[0].parts.push({ text: prompt });
  
  try {
    console.log("Sending schema generation request to Gemini API");
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error("Gemini API error response:", errorData);
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error("No response from Gemini API");
    }
    
    // Extract schema from response
    const schemaText = data.candidates[0].content.parts.map((part: any) => part.text).join("\n");
    
    // Parse schema JSON
    let schema;
    try {
      const jsonMatch = schemaText.match(/```json\s*([\s\S]*?)\s*```|({[\s\S]*})/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : schemaText;
      schema = JSON.parse(jsonStr.replace(/```json|```/g, '').trim());
    } catch (parseError) {
      console.error("Error parsing schema JSON:", parseError);
      console.log("Raw schema text:", schemaText);
      throw new Error("Failed to parse schema JSON from Gemini response");
    }
    
    // Store schema in database
    const schemaId = crypto.randomUUID();
    const { error: insertError } = await supabase
      .from('document_schemas')
      .insert({
        id: schemaId,
        name: schema.schema?.name || `Schema for ${documents.length} document(s)`,
        description: schema.schema?.description || "Automatically generated schema",
        structure: schema.schema?.tables || [],
        rationale: schema.schema?.rationale || "",
        suggestions: schema.schema?.suggestions || [],
        organization_id: documents[0].organization_id || documents[0].user_id
      });
    
    if (insertError) {
      console.error("Error storing schema:", insertError);
    }
    
    return {
      ...schema,
      id: schemaId
    };
  } catch (error) {
    console.error("Error in generateSchema:", error);
    throw error;
  }
}

async function extractData(documentId: string, schemaId: string, model: string, apiKey: string, supabase: any, includeImages: boolean) {
  console.log(`Extracting data from document ${documentId} using schema ${schemaId}`);
  
  // Get document information
  const { data: document, error: docError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();
  
  if (docError || !document) {
    throw new Error(`Document not found: ${docError?.message || 'Unknown error'}`);
  }
  
  // Get schema information
  const { data: schema, error: schemaError } = await supabase
    .from('document_schemas')
    .select('*')
    .eq('id', schemaId)
    .single();
  
  if (schemaError || !schema) {
    throw new Error(`Schema not found: ${schemaError?.message || 'Unknown error'}`);
  }
  
  let imageUrls: string[] = [];
  
  // Get document pages for images if needed
  if (includeImages) {
    const { data: pages, error: pagesError } = await supabase
      .from('document_pages')
      .select('*')
      .eq('document_id', documentId)
      .order('page_number', { ascending: true });
    
    if (pagesError) {
      console.error("Error fetching document pages:", pagesError);
    } else if (pages && pages.length > 0) {
      // Add page images to context
      imageUrls = pages.map(page => page.image_url).filter(Boolean);
    }
  }
  
  // Build the prompt
  const prompt = `Extract structured data from the provided document images according to the following schema. 

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
}`;

  try {
    const startTime = Date.now();
    
    // Prepare request payload
    const payload: any = {
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt }
          ]
        }
      ],
      generation_config: {
        temperature: 0.1,
        top_p: 0.95,
        top_k: 40,
        max_output_tokens: 8192,
      }
    };
    
    // Add images to the parts if available
    if (imageUrls.length > 0) {
      for (const imageUrl of imageUrls) {
        try {
          // Fetch the image and convert to base64
          const imageResponse = await fetch(imageUrl);
          if (!imageResponse.ok) {
            console.error(`Failed to fetch image: ${imageUrl}`, imageResponse.status);
            continue;
          }
          
          const imageArrayBuffer = await imageResponse.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(imageArrayBuffer)));
          const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';
          
          payload.contents[0].parts.push({
            inline_data: {
              mime_type: mimeType,
              data: base64
            }
          });
        } catch (imageError) {
          console.error(`Error processing image ${imageUrl}:`, imageError);
        }
      }
    }
    
    // Call Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error("Gemini API error response:", errorData);
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error("No response from Gemini API");
    }
    
    // Extract extraction data from response
    const extractionText = data.candidates[0].content.parts.map((part: any) => part.text).join("\n");
    const processingTime = Date.now() - startTime;
    
    // Parse extraction JSON
    let extractedData;
    try {
      const jsonMatch = extractionText.match(/```json\s*([\s\S]*?)\s*```|({[\s\S]*})/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : extractionText;
      extractedData = JSON.parse(jsonStr.replace(/```json|```/g, '').trim());
    } catch (parseError) {
      console.error("Error parsing extraction JSON:", parseError);
      console.log("Raw extraction text:", extractionText);
      throw new Error("Failed to parse extraction JSON from Gemini response");
    }
    
    // Store extracted data in database
    if (extractedData.extractedData) {
      // Extract data for storage
      const dataToStore = [];
      
      for (const [tableName, fields] of Object.entries(extractedData.extractedData)) {
        const tableObj = schema.structure.find((t: any) => t.name === tableName);
        if (!tableObj) continue;
        
        for (const [fieldName, value] of Object.entries(fields as Record<string, any>)) {
          const fieldObj = tableObj.fields.find((f: any) => f.name === fieldName);
          if (!fieldObj) continue;
          
          dataToStore.push({
            document_id: documentId,
            table_id: tableObj.id,
            field_id: fieldObj.id,
            value: String(value),
            confidence: extractedData.confidence || 0.9
          });
        }
      }
      
      // Store data
      if (dataToStore.length > 0) {
        // Clear any existing data for this document
        await supabase
          .from('document_data')
          .delete()
          .eq('document_id', documentId);
        
        // Insert new data
        const { error: insertError } = await supabase
          .from('document_data')
          .insert(dataToStore);
        
        if (insertError) {
          console.error("Error storing extracted data:", insertError);
        }
      }
    }
    
    return {
      ...extractedData,
      processingTime: `${processingTime}ms`
    };
  } catch (error) {
    console.error("Error in extractData:", error);
    throw error;
  }
}
