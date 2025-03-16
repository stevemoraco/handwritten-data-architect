
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.8.0";
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "https://esm.sh/@google/generative-ai@0.1.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY") || "";

const MODEL_NAME = "gemini-2.0-flash-lite";
const MAX_ATTEMPTS = 3;

serve(async (req) => {
  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
  };

  // Handle OPTIONS request for CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers, status: 204 });
  }

  try {
    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Parse request body
    const { documentId, pageUrls } = await req.json();
    
    if (!documentId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing documentId parameter" 
        }),
        { headers, status: 400 }
      );
    }
    
    // Initialize Google Generative AI
    if (!GOOGLE_API_KEY) {
      console.error("GOOGLE_API_KEY is not set");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "GOOGLE_API_KEY is not configured on the server" 
        }), 
        { headers, status: 500 }
      );
    }
    
    const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: MODEL_NAME,
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
      ],
    });
    
    // Log the process start
    await supabase.from("processing_logs").insert({
      document_id: documentId,
      action: "Gemini Transcription Started",
      status: "success",
      message: `Starting transcription with ${MODEL_NAME} model`
    });
    
    // Update document status to processing
    await supabase
      .from("documents")
      .update({
        status: "processing",
        processing_progress: 10,
        processing_error: null
      })
      .eq("id", documentId);
      
    // If pageUrls is not provided, fetch them from the database
    let imagesToProcess = pageUrls || [];
    if (!imagesToProcess.length) {
      const { data: pages, error: pagesError } = await supabase
        .from("document_pages")
        .select("image_url")
        .eq("document_id", documentId)
        .order("page_number", { ascending: true });
      
      if (pagesError) {
        console.error("Error fetching page URLs:", pagesError);
        throw new Error(`Failed to fetch page URLs: ${pagesError.message}`);
      }
      
      imagesToProcess = pages.map(page => page.image_url).filter(Boolean);
    }
    
    if (imagesToProcess.length === 0) {
      throw new Error("No images to process for this document");
    }
    
    console.log(`Processing ${imagesToProcess.length} images for document ${documentId}`);
    
    // Update progress
    await supabase
      .from("documents")
      .update({ processing_progress: 20 })
      .eq("id", documentId);
      
    // Create the prompt for document transcription
    const systemPrompt = `
I need you to transcribe the content from these document images into clean, formatted Markdown. 
This is important:
1. Preserve the exact text content from the document
2. Maintain proper heading structure (use # for main titles, ## for subtitles, etc.)
3. Represent tables using markdown table syntax with | and -
4. Keep bullet points and numbered lists intact
5. Maintain paragraph breaks and formatting
6. If there are forms, represent form fields clearly
7. Ignore watermarks, page numbers, or irrelevant headers/footers
8. For any unclear or illegible text, indicate with [illegible]
9. Your output should be valid Markdown that renders properly

The transcription should be as close as possible to the original document while being well-structured in Markdown.
`;

    // Save the system prompt
    await supabase.from("document_prompts").insert({
      document_id: documentId,
      prompt_type: "transcription",
      prompt_text: systemPrompt
    });
    
    // Update progress
    await supabase
      .from("documents")
      .update({ processing_progress: 30 })
      .eq("id", documentId);
  
    // Process images in batches to avoid timeout
    const batchSize = 5;
    const batches = [];
    for (let i = 0; i < imagesToProcess.length; i += batchSize) {
      batches.push(imagesToProcess.slice(i, i + batchSize));
    }
  
    let transcriptions = [];
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchNumber = i + 1;
      
      console.log(`Processing batch ${batchNumber}/${batches.length} (${batch.length} images)`);
      
      const batchPrompt = `
This is batch ${batchNumber} of ${batches.length} from a document with ${imagesToProcess.length} pages.
${systemPrompt}
`;
      
      // Build the content parts array with images
      const contentParts = [{ text: batchPrompt }];
      
      for (const imageUrl of batch) {
        try {
          const imageResponse = await fetch(imageUrl);
          if (!imageResponse.ok) {
            console.error(`Failed to fetch image: ${imageUrl}, status: ${imageResponse.status}`);
            continue;
          }
          
          const imageBlob = await imageResponse.blob();
          const imagePart = {
            inlineData: {
              mimeType: imageResponse.headers.get("content-type") || "image/jpeg",
              data: await blobToBase64(imageBlob),
            },
          };
          
          contentParts.push(imagePart);
        } catch (err) {
          console.error(`Error processing image ${imageUrl}:`, err);
        }
      }
      
      let attempt = 0;
      let batchTranscription = "";
      let success = false;
      
      while (attempt < MAX_ATTEMPTS && !success) {
        attempt++;
        try {
          const result = await model.generateContent({
            contents: [{ role: "user", parts: contentParts }],
            generationConfig: {
              temperature: 0.1,
              topP: 0.8,
              topK: 40,
              maxOutputTokens: 8192,
            },
          });
          
          const response = result.response;
          batchTranscription = response.text();
          success = true;
          
        } catch (err) {
          console.error(`Attempt ${attempt} failed for batch ${batchNumber}:`, err);
          
          // Log the error
          await supabase.from("processing_logs").insert({
            document_id: documentId,
            action: `Batch ${batchNumber} Transcription Attempt ${attempt}`,
            status: "error",
            message: `Error: ${err.message}\n\nStack: ${err.stack || 'No stack trace'}\n\nFull error: ${JSON.stringify(err, null, 2)}`
          });
          
          if (attempt >= MAX_ATTEMPTS) {
            throw new Error(`Failed to process batch ${batchNumber} after ${MAX_ATTEMPTS} attempts: ${err.message}`);
          }
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      transcriptions.push(batchTranscription);
      
      // Update progress
      const progressPercentage = Math.min(30 + Math.round(60 * (i + 1) / batches.length), 90);
      await supabase
        .from("documents")
        .update({ processing_progress: progressPercentage })
        .eq("id", documentId);
        
      // Log successful batch
      await supabase.from("processing_logs").insert({
        document_id: documentId,
        action: `Batch ${batchNumber} Transcription Complete`,
        status: "success",
        message: `Processed ${batch.length} images in batch ${batchNumber} of ${batches.length}`
      });
    }
    
    // Combine all transcriptions
    const fullTranscription = transcriptions.join("\n\n");
    
    // Update the document with the transcription
    await supabase
      .from("documents")
      .update({
        status: "processed",
        processing_progress: 100,
        transcription: fullTranscription
      })
      .eq("id", documentId);
      
    // Log completion
    await supabase.from("processing_logs").insert({
      document_id: documentId,
      action: "Transcription Complete",
      status: "success",
      message: `Transcribed ${imagesToProcess.length} pages successfully`
    });
    
    return new Response(
      JSON.stringify({
        success: true,
        transcription: fullTranscription,
      }),
      { headers, status: 200 }
    );
    
  } catch (error) {
    console.error("Error processing document:", error);
    
    // Log the complete error information
    const errorDetails = {
      message: error.message || "Unknown error",
      stack: error.stack || "No stack trace",
      name: error.name,
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
    };
    
    console.error("Detailed error:", errorDetails);
    
    try {
      // Create Supabase client
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      // Parse request body to get documentId
      let documentId = "";
      try {
        const body = await req.json();
        documentId = body.documentId;
      } catch (e) {
        console.error("Failed to parse request body:", e);
      }
      
      if (documentId) {
        // Update document status to failed
        await supabase
          .from("documents")
          .update({
            status: "failed",
            processing_error: errorDetails.message
          })
          .eq("id", documentId);
          
        // Log the error
        await supabase.from("processing_logs").insert({
          document_id: documentId,
          action: "Transcription Failed",
          status: "error",
          message: JSON.stringify(errorDetails, null, 2)
        });
      }
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorDetails.message,
        details: errorDetails
      }),
      { headers, status: 500 }
    );
  }
});

async function blobToBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
