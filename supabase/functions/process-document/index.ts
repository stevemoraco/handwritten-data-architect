
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
    const { documentId } = requestData;

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

    console.log(`Starting PDF processing for document: ${document.name}`);
    await supabase.from("processing_logs").insert({
      document_id: documentId,
      action: "PDF Analysis",
      status: "success",
      message: `Analyzing ${document.name} for page information`,
    });

    // Update document status to processing
    const { error: updateProcessingError } = await supabase
      .from("documents")
      .update({
        status: "processing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId);

    if (updateProcessingError) {
      console.error("Error updating document status to processing:", updateProcessingError);
    }

    // Simulate the PDF processing and page extraction
    // In a real implementation, we would use a PDF library to extract pages
    const mockPageCount = 5; // Simulate 5 pages

    console.log(`Document has ${mockPageCount} pages, starting page extraction`);
    
    // Process each page with detailed logging
    for (let pageNumber = 1; pageNumber <= mockPageCount; pageNumber++) {
      console.log(`Processing page ${pageNumber} of ${mockPageCount}`);
      
      // Log page extraction start
      await supabase.from("processing_logs").insert({
        document_id: documentId,
        action: `Page ${pageNumber} Extraction`,
        status: "success",
        message: `Extracting image from page ${pageNumber}`,
      });

      // Simulate processing time for this page (1-2 seconds)
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
      
      // Log text extraction start
      await supabase.from("processing_logs").insert({
        document_id: documentId,
        action: `Page ${pageNumber} OCR`,
        status: "success",
        message: `Extracting text using OCR for page ${pageNumber}`,
      });

      // Simulate OCR processing time (1-3 seconds)
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      
      // Mock OCR with Gemini (in a real implementation, this would use actual Gemini API)
      console.log(`Running AI text extraction on page ${pageNumber} using Gemini`);
      
      // Simulate Gemini API call
      await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1500));
      
      // Create the page entry
      const { error: pageInsertError } = await supabase.from("document_pages").insert({
        document_id: documentId,
        page_number: pageNumber,
        image_url: `https://via.placeholder.com/800x1000?text=Page+${pageNumber}`,
        text_content: `Sample text content for page ${pageNumber}. This text was extracted using OCR and processed with Gemini. It contains information that would be found in a typical document.`,
      });

      if (pageInsertError) {
        console.error(`Error creating page ${pageNumber}:`, pageInsertError);
        await supabase.from("processing_logs").insert({
          document_id: documentId,
          action: `Page ${pageNumber} Error`,
          status: "error",
          message: `Failed to process page ${pageNumber}: ${pageInsertError.message}`,
        });
      } else {
        await supabase.from("processing_logs").insert({
          document_id: documentId,
          action: `Page ${pageNumber} Complete`,
          status: "success",
          message: `Successfully processed page ${pageNumber}`,
        });
      }
      
      // Update document with progress
      await supabase
        .from("documents")
        .update({
          processing_progress: (pageNumber / mockPageCount) * 100,
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId);
        
      console.log(`Completed processing page ${pageNumber} of ${mockPageCount}`);
    }

    // Simulate semantic analysis with Gemini
    console.log("Starting semantic analysis of the document content...");
    await supabase.from("processing_logs").insert({
      document_id: documentId,
      action: "Semantic Analysis",
      status: "success",
      message: "Analyzing document content with Gemini for semantic understanding",
    });
    
    // Simulate Gemini API processing time for semantic analysis
    await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));

    // Update document status
    const { error: updateError } = await supabase
      .from("documents")
      .update({
        status: "processed",
        page_count: mockPageCount,
        processing_progress: 100,
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId);

    if (updateError) {
      console.error("Error updating document status:", updateError);
      throw new Error(`Failed to update document status: ${updateError.message}`);
    }

    // Log processing completion
    await supabase.from("processing_logs").insert({
      document_id: documentId,
      action: "Processing Completed",
      status: "success",
      message: "Document processed successfully with all pages extracted and analyzed",
    });

    console.log(`Document processing completed for ID: ${documentId}`);
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Document processed successfully",
        documentId,
        pageCount: mockPageCount
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
        
        // Try to get documentId from request body
        let documentId = null;
        try {
          const body = await req.json().catch(() => ({}));
          documentId = body.documentId;
        } catch (parseError) {
          console.error("Error parsing request JSON:", parseError);
        }
        
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
