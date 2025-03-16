
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
    const { documentId } = await req.json();

    if (!documentId) {
      throw new Error("Document ID is required");
    }

    console.log(`Processing document with ID: ${documentId}`);

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
      action: "Processing Started",
      status: "success",
      message: "Document processing started",
    });

    // In a real implementation, we would:
    // 1. Download the PDF from storage
    // 2. Split into pages and save each page as an image
    // 3. Extract text from each page using OCR or text extraction
    // 4. Update document status and metadata

    // Mock processing for demonstration
    console.log("Simulating document processing...");
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Update document status
    const { error: updateError } = await supabase
      .from("documents")
      .update({
        status: "processed",
        page_count: 5, // Mock page count
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId);

    if (updateError) {
      console.error("Error updating document status:", updateError);
      throw new Error(`Failed to update document status: ${updateError.message}`);
    }

    // Create mock page entries
    const pagePromises = [];
    for (let i = 1; i <= 5; i++) {
      pagePromises.push(supabase.from("document_pages").insert({
        document_id: documentId,
        page_number: i,
        image_url: `https://via.placeholder.com/800x1000?text=Page+${i}`,
        text_content: `Sample text content for page ${i}`,
      }));
    }

    await Promise.all(pagePromises);

    // Log processing completion
    await supabase.from("processing_logs").insert({
      document_id: documentId,
      action: "Processing Completed",
      status: "success",
      message: "Document processed successfully",
    });

    console.log(`Document processing completed for ID: ${documentId}`);
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Document processed successfully",
        documentId 
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
        
        if (body.documentId) {
          await supabase.from("processing_logs").insert({
            document_id: body.documentId,
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
            .eq("id", body.documentId);
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
