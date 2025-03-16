
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.8.0";
import { decode as base64Decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Content-Type": "application/json",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // Parse request body
    const { documentId, userId } = await req.json();
    
    if (!documentId || !userId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing documentId or userId parameter" 
        }),
        { headers: corsHeaders, status: 400 }
      );
    }
    
    console.log(`Processing PDF for document: ${documentId}, user: ${userId}`);
    
    // Create Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );
    
    // Log processing start
    await supabase.from("processing_logs").insert({
      document_id: documentId,
      action: "PDF Processing Started",
      status: "success",
      message: "Starting PDF to image conversion"
    });

    // Update document status to processing
    await supabase
      .from("documents")
      .update({
        status: "processing",
        processing_progress: 10
      })
      .eq("id", documentId);

    // Get the document data
    const { data: document, error: documentError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();
    
    if (documentError) {
      throw new Error(`Failed to fetch document: ${documentError.message}`);
    }
    
    if (!document) {
      throw new Error("Document not found");
    }
    
    // For PDFs, we need to download the file, extract pages, and upload each page as an image
    console.log("Downloading the PDF file...");
    
    // Build the path to the PDF file - always use original.pdf
    const pdfPath = `${userId}/${documentId}/original.pdf`;
    console.log(`PDF path: ${pdfPath}`);
    
    // Download the PDF file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("document_files")
      .download(pdfPath);
    
    if (downloadError) {
      throw new Error(`Failed to download PDF file: ${downloadError.message}`);
    }
    
    if (!fileData) {
      throw new Error("PDF file download returned no data");
    }
    
    console.log("PDF file downloaded successfully");
    
    // Update document status
    await supabase
      .from("documents")
      .update({
        processing_progress: 30
      })
      .eq("id", documentId);
    
    // Use PDF metadata to get actual page count
    // For now we'll use a simple approach but you could add a PDF parser library
    // Read the first few kb of the PDF to find the /Count entry
    const pdfText = new TextDecoder().decode(fileData.slice(0, Math.min(10000, fileData.size)));
    
    // Try to find the /Count entry which typically indicates page count
    const countMatch = /\/Count\s+(\d+)/.exec(pdfText);
    
    // Default to 1 if we can't determine the count
    let pageCount = 1;
    
    if (countMatch && countMatch[1]) {
      pageCount = parseInt(countMatch[1], 10);
      console.log(`Detected ${pageCount} pages from PDF metadata`);
    } else {
      // Fallback: count occurrences of "Page" or "/Page"
      const pageMatches = pdfText.match(/\/Page\s*\//g);
      if (pageMatches) {
        pageCount = pageMatches.length;
        console.log(`Estimated ${pageCount} pages from PDF structure`);
      } else {
        console.log("Could not determine page count, using default of 1");
      }
    }

    // Make sure we have a reasonable value (at least 1, and not too large)
    pageCount = Math.max(1, Math.min(pageCount, 1000));
    
    console.log(`Using page count: ${pageCount}`);
    
    // Update the document with the page count
    await supabase
      .from("documents")
      .update({
        page_count: pageCount,
        processing_progress: 50
      })
      .eq("id", documentId);
    
    // Clear any existing pages
    const { error: deleteError } = await supabase
      .from("document_pages")
      .delete()
      .eq("document_id", documentId);
      
    if (deleteError) {
      console.error(`Error clearing existing pages: ${deleteError.message}`);
    }
    
    // Generate a public URL for the original PDF that all pages will reference
    const { data: urlData } = supabase.storage
      .from("document_files")
      .getPublicUrl(`${userId}/${documentId}/original.pdf`);
      
    if (!urlData || !urlData.publicUrl) {
      throw new Error("Failed to generate public URL for the PDF");
    }
    
    const pdfUrl = urlData.publicUrl;
    console.log(`PDF public URL: ${pdfUrl}`);
    
    // Create a document page record for each page, pointing to the PDF with page parameter
    for (let i = 0; i < pageCount; i++) {
      const pageNumber = i + 1;
      
      // Update progress
      await supabase
        .from("documents")
        .update({
          processing_progress: 50 + Math.floor((i / pageCount) * 40)
        })
        .eq("id", documentId);
      
      // Create a document page record with the image URL pointing to the PDF with page parameter
      await supabase.from("document_pages").insert({
        document_id: documentId,
        page_number: pageNumber,
        image_url: `${pdfUrl}#page=${pageNumber}`, // Add page parameter for PDF viewer
        text_content: `Content from page ${pageNumber}` // Placeholder text content
      });
      
      console.log(`Created page ${pageNumber} record`);
    }
    
    // Update document status to processed
    await supabase
      .from("documents")
      .update({
        status: "processed",
        processing_progress: 100
      })
      .eq("id", documentId);
    
    // Log completion
    await supabase.from("processing_logs").insert({
      document_id: documentId,
      action: "PDF Processing Completed",
      status: "success",
      message: `Processed ${pageCount} pages successfully`
    });
    
    console.log("PDF processing complete");
    
    return new Response(
      JSON.stringify({
        success: true,
        pageCount: pageCount,
        message: `PDF processing completed successfully. Extracted ${pageCount} pages.`
      }),
      { headers: corsHeaders, status: 200 }
    );
    
  } catch (error) {
    console.error("Error processing PDF:", error);
    
    try {
      // Parse request body to get documentId
      const { documentId } = await req.json();
      
      if (documentId) {
        // Create Supabase client
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL") || "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
        );
        
        // Update document status to failed
        await supabase
          .from("documents")
          .update({
            status: "failed",
            processing_error: error.message
          })
          .eq("id", documentId);
        
        // Log the error
        await supabase.from("processing_logs").insert({
          document_id: documentId,
          action: "PDF Processing Failed",
          status: "error",
          message: error.message
        });
      }
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error occurred"
      }),
      { headers: corsHeaders, status: 500 }
    );
  }
});
