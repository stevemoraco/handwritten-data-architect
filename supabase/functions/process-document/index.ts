
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { decode as base64Decode } from "https://deno.land/std@0.177.0/encoding/base64.ts";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create response with CORS headers
function responseWithCors(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    const { documentId, documentIds, operation, schemaId } = requestData;

    if (!documentId && !documentIds) {
      return responseWithCors({
        success: false,
        error: "Missing required parameter: documentId or documentIds"
      }, 400);
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return responseWithCors({
        success: false,
        error: "Server configuration error: Missing Supabase credentials"
      }, 500);
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Processing document operation: ${operation} for document(s): ${documentId || documentIds?.join(', ')}`);
    
    // Log start of processing
    if (documentId) {
      await supabase.from('processing_logs').insert({
        document_id: documentId,
        action: `${operation} Start`,
        status: 'success',
        message: `Started ${operation} operation`
      });
    }

    // Perform the requested operation
    if (operation === 'generateSchema') {
      return await generateSchema(supabase, documentIds);
    } else if (operation === 'extractData') {
      if (!schemaId) {
        return responseWithCors({
          success: false,
          error: "Missing required parameter: schemaId"
        }, 400);
      }
      return await extractData(supabase, documentId, schemaId);
    } else {
      return responseWithCors({
        success: false,
        error: `Unknown operation: ${operation}`
      }, 400);
    }
  } catch (error) {
    console.error("Error in process-document function:", error);
    return responseWithCors({
      success: false,
      error: `Server error: ${error.message || "Unknown error"}`
    }, 500);
  }
});

async function generateSchema(supabase: any, documentIds: string[]) {
  if (!documentIds || documentIds.length === 0) {
    return responseWithCors({
      success: false,
      error: "No documents provided for schema generation"
    }, 400);
  }

  try {
    console.log(`Generating schema for documents: ${documentIds.join(', ')}`);
    
    // Fetch document data
    const { data: documents, error: documentsError } = await supabase
      .from('documents')
      .select('id, name, transcription')
      .in('id', documentIds)
      .order('created_at', { ascending: false });
    
    if (documentsError) {
      console.error("Error fetching documents:", documentsError);
      return responseWithCors({
        success: false,
        error: `Failed to fetch documents: ${documentsError.message}`
      }, 500);
    }
    
    if (!documents || documents.length === 0) {
      return responseWithCors({
        success: false,
        error: "No documents found with the provided IDs"
      }, 404);
    }
    
    // Combine all document transcriptions
    const combinedText = documents
      .map(doc => doc.transcription)
      .filter(text => text && text.trim().length > 0)
      .join("\n\n");
    
    if (!combinedText || combinedText.trim().length === 0) {
      return responseWithCors({
        success: false,
        error: "No text content found in the provided documents"
      }, 400);
    }

    // Generate schema from text using Gemini API
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return responseWithCors({
        success: false,
        error: "Server configuration error: Missing Gemini API key"
      }, 500);
    }

    // Prepare the prompt for Gemini
    const modelName = "gemini-1.5-pro-latest";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    
    const documentDescriptions = documents.map(doc => `- "${doc.name}": ${doc.transcription ? doc.transcription.substring(0, 200) + "..." : "No transcription available"}`).join("\n");
    
    const prompt = `
    You are a document schema analyzer. Given the transcribed content of documents, create a structured schema that represents the data in these documents.
    
    Documents:
    ${documentDescriptions}
    
    Your task is to analyze the document content and generate a JSON schema that represents the structured data within these documents.
    The schema should have the following structure:
    {
      "schema": {
        "name": "A descriptive name for the schema",
        "description": "A brief description of what this schema represents",
        "tables": [
          {
            "name": "Table name (e.g., 'Customer Information')",
            "description": "What this table represents",
            "fields": [
              {
                "name": "Field name (e.g., 'customer_name')",
                "description": "What this field represents",
                "type": "string|number|date|boolean",
                "required": true/false
              }
            ]
          }
        ],
        "rationale": "Explanation of why you structured the schema this way",
        "suggestions": [
          {
            "description": "Suggestion for improvement",
            "type": "add|modify|remove",
            "impact": "low|medium|high"
          }
        ]
      }
    }
    
    Only respond with the valid JSON object, nothing else.
    `;

    // Call Gemini API
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 8192
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Gemini API error:", errorData);
      return responseWithCors({
        success: false,
        error: `Failed to generate schema: API error (${response.status})`
      }, 500);
    }

    const geminiResponse = await response.json();
    console.log("Gemini API response received");
    
    if (!geminiResponse.candidates || geminiResponse.candidates.length === 0) {
      return responseWithCors({
        success: false,
        error: "No results returned from Gemini API"
      }, 500);
    }

    const content = geminiResponse.candidates[0].content;
    if (!content || !content.parts || content.parts.length === 0) {
      return responseWithCors({
        success: false,
        error: "Empty content returned from Gemini API"
      }, 500);
    }

    const schemaText = content.parts[0].text;
    let schemaJson;
    
    try {
      // Extract JSON from the text (in case there's any extra text)
      const jsonMatch = schemaText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        schemaJson = JSON.parse(jsonMatch[0]);
      } else {
        schemaJson = JSON.parse(schemaText);
      }
    } catch (parseError) {
      console.error("Error parsing schema JSON:", parseError);
      return responseWithCors({
        success: false,
        error: `Failed to parse schema: ${parseError.message}`
      }, 500);
    }

    // Save the schema to the database
    const { data: schemaData, error: schemaError } = await supabase
      .from('document_schemas')
      .insert({
        name: schemaJson.schema?.name || `Schema for ${documents.length} document(s)`,
        description: schemaJson.schema?.description || "Automatically generated schema",
        structure: schemaJson.schema?.tables || [],
        rationale: schemaJson.schema?.rationale || "",
        suggestions: schemaJson.schema?.suggestions || [],
      })
      .select()
      .single();
    
    if (schemaError) {
      console.error("Error saving schema:", schemaError);
      return responseWithCors({
        success: false,
        error: `Failed to save schema: ${schemaError.message}`
      }, 500);
    }

    // Log success for each document
    for (const docId of documentIds) {
      await supabase.from('processing_logs').insert({
        document_id: docId,
        action: 'Schema Generation',
        status: 'success',
        message: `Generated schema: ${schemaJson.schema?.name || "Unnamed schema"}`
      });
    }

    return responseWithCors({
      success: true,
      result: schemaJson,
      schemaId: schemaData.id
    });
  } catch (error) {
    console.error("Error in generateSchema:", error);
    
    // Log error for each document
    for (const docId of documentIds) {
      await supabase.from('processing_logs').insert({
        document_id: docId,
        action: 'Schema Generation Error',
        status: 'error',
        message: error.message || "Unknown error in schema generation"
      });
    }
    
    return responseWithCors({
      success: false,
      error: `Error generating schema: ${error.message || "Unknown error"}`
    }, 500);
  }
}

async function extractData(supabase: any, documentId: string, schemaId: string) {
  if (!documentId) {
    return responseWithCors({
      success: false,
      error: "Missing required parameter: documentId"
    }, 400);
  }

  if (!schemaId) {
    return responseWithCors({
      success: false,
      error: "Missing required parameter: schemaId"
    }, 400);
  }

  try {
    console.log(`Extracting data for document ${documentId} using schema ${schemaId}`);
    
    // Fetch document data
    const { data: document, error: documentError } = await supabase
      .from('documents')
      .select('id, name, transcription')
      .eq('id', documentId)
      .single();
    
    if (documentError) {
      console.error("Error fetching document:", documentError);
      return responseWithCors({
        success: false,
        error: `Failed to fetch document: ${documentError.message}`
      }, 500);
    }
    
    if (!document) {
      return responseWithCors({
        success: false,
        error: "Document not found"
      }, 404);
    }
    
    if (!document.transcription) {
      return responseWithCors({
        success: false,
        error: "Document has no transcription"
      }, 400);
    }

    // Fetch schema data
    const { data: schema, error: schemaError } = await supabase
      .from('document_schemas')
      .select('id, name, structure')
      .eq('id', schemaId)
      .single();
    
    if (schemaError) {
      console.error("Error fetching schema:", schemaError);
      return responseWithCors({
        success: false,
        error: `Failed to fetch schema: ${schemaError.message}`
      }, 500);
    }
    
    if (!schema) {
      return responseWithCors({
        success: false,
        error: "Schema not found"
      }, 404);
    }

    // Extract data using Gemini API
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return responseWithCors({
        success: false,
        error: "Server configuration error: Missing Gemini API key"
      }, 500);
    }

    // Prepare the prompt for Gemini
    const modelName = "gemini-1.5-pro-latest";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    
    // Create prompt with schema structure and document content
    const schemaStructure = JSON.stringify(schema.structure, null, 2);
    
    const prompt = `
    You are a document data extractor. Given a document's text and a schema structure, extract the relevant data according to the schema.
    
    DOCUMENT NAME: ${document.name}
    
    DOCUMENT TEXT:
    ${document.transcription.substring(0, 15000)} ${document.transcription.length > 15000 ? '... (truncated)' : ''}
    
    SCHEMA STRUCTURE:
    ${schemaStructure}
    
    Extract the relevant data from the document according to the schema structure. For each table and field in the schema, 
    find the corresponding values in the document. If a value can't be found, leave it as null or indicate that it's missing.
    
    Return the extracted data in the following JSON format:
    {
      "extraction": {
        "tableName1": {
          "fieldName1": "extracted value",
          "fieldName2": "extracted value"
        },
        "tableName2": {
          "fieldName1": "extracted value",
          "fieldName2": "extracted value"
        }
      },
      "confidence": 0.85,
      "missing_fields": ["tableName1.fieldName3", "tableName2.fieldName1"]
    }
    
    Only respond with the valid JSON object, nothing else.
    `;

    // Call Gemini API
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 8192
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Gemini API error:", errorData);
      return responseWithCors({
        success: false,
        error: `Failed to extract data: API error (${response.status})`
      }, 500);
    }

    const geminiResponse = await response.json();
    console.log("Gemini API response received for data extraction");
    
    if (!geminiResponse.candidates || geminiResponse.candidates.length === 0) {
      return responseWithCors({
        success: false,
        error: "No results returned from Gemini API"
      }, 500);
    }

    const content = geminiResponse.candidates[0].content;
    if (!content || !content.parts || content.parts.length === 0) {
      return responseWithCors({
        success: false,
        error: "Empty content returned from Gemini API"
      }, 500);
    }

    const extractionText = content.parts[0].text;
    let extractionJson;
    
    try {
      // Extract JSON from the text (in case there's any extra text)
      const jsonMatch = extractionText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractionJson = JSON.parse(jsonMatch[0]);
      } else {
        extractionJson = JSON.parse(extractionText);
      }
    } catch (parseError) {
      console.error("Error parsing extraction JSON:", parseError);
      return responseWithCors({
        success: false,
        error: `Failed to parse extraction: ${parseError.message}`
      }, 500);
    }

    // Save extracted data to the database
    if (extractionJson.extraction) {
      for (const [tableName, tableData] of Object.entries(extractionJson.extraction)) {
        for (const [fieldName, fieldValue] of Object.entries(tableData)) {
          if (fieldValue !== null && fieldValue !== undefined) {
            await supabase.from('document_data').insert({
              document_id: documentId,
              table_id: tableName,
              field_id: fieldName,
              value: String(fieldValue),
              confidence: extractionJson.confidence || 0.5
            });
          }
        }
      }
    }

    // Log success
    await supabase.from('processing_logs').insert({
      document_id: documentId,
      action: 'Data Extraction',
      status: 'success',
      message: `Extracted data using schema: ${schema.name}`
    });

    return responseWithCors({
      success: true,
      result: extractionJson
    });
  } catch (error) {
    console.error("Error in extractData:", error);
    
    // Log error
    await supabase.from('processing_logs').insert({
      document_id: documentId,
      action: 'Data Extraction Error',
      status: 'error',
      message: error.message || "Unknown error in data extraction"
    });
    
    return responseWithCors({
      success: false,
      error: `Error extracting data: ${error.message || "Unknown error"}`
    }, 500);
  }
}
