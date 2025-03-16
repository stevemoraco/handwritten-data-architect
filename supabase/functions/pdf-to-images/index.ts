
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

    console.log(`Converting PDF to images for document ID: ${documentId}`);

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
      action: "PDF to Images Conversion",
      status: "success",
      message: "PDF to images conversion started",
    });

    // In a real implementation, we would:
    // 1. Download the PDF from storage
    // 2. Use a PDF processing library to convert pages to images
    // 3. Upload each image back to storage
    // 4. Create document_pages records

    // Mock processing for demonstration
    console.log("Simulating PDF to images conversion...");
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create mock page entries
    const pages = [];
    for (let i = 1; i <= 5; i++) {
      const imagePath = `${document.user_id}/${documentId}/page_${i}.png`;
      
      // In a real implementation, we would create and upload the actual image here
      
      // Create page record
      const { data: page, error: pageError } = await supabase
        .from("document_pages")
        .insert({
          document_id: documentId,
          page_number: i,
          image_url: `https://via.placeholder.com/800x1000?text=Page+${i}`,
          text_content: `Sample text content for page ${i}`,
        })
        .select()
        .single();
      
      if (pageError) {
        throw new Error(`Failed to create page record: ${pageError.message}`);
      }
      
      pages.push(page);
    }

    // Update document status and page count
    await supabase
      .from("documents")
      .update({
        status: "processed",
        page_count: pages.length,
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId);

    // Log processing completion
    await supabase.from("processing_logs").insert({
      document_id: documentId,
      action: "PDF to Images Conversion",
      status: "success",
      message: `Successfully converted PDF to ${pages.length} images`,
    });

    console.log(`PDF conversion completed for document ID: ${documentId}`);
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully converted PDF to ${pages.length} images`,
        pages 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error converting PDF to images:", error);
    
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
            action: "PDF to Images Conversion",
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
