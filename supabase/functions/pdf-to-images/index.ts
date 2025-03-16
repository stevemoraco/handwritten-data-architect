
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.8.0";
import { convert } from "https://esm.sh/pdf-img-convert@1.2.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

serve(async (req) => {
  console.log("PDF-to-images function called");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling CORS preflight request");
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  // Set CORS headers for all responses
  const headers = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    // Parse request body
    const reqData = await req.json().catch(err => {
      console.error("Error parsing request JSON:", err);
      throw new Error("Invalid JSON body");
    });
    
    const { documentId, userId } = reqData;

    console.log(`Request received with documentId: ${documentId}, userId: ${userId}`);

    if (!documentId || !userId) {
      console.error("Missing documentId or userId");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing documentId or userId"
        }),
        { headers, status: 400 }
      );
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Log processing start
    await supabase.from("processing_logs").insert({
      document_id: documentId,
      action: "PDF Conversion Started",
      status: "success",
      message: "Starting PDF to JPG conversion"
    });
    
    // Update document status
    await supabase
      .from("documents")
      .update({
        status: "processing",
        processing_progress: 5,
        processing_error: null
      })
      .eq("id", documentId);
    
    // Get document file path and details
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("name, type, original_url")
      .eq("id", documentId)
      .single();
    
    if (docError) {
      console.error("Document fetch error:", docError);
      throw new Error(`Document not found: ${docError.message}`);
    }
    
    if (document.type !== "pdf") {
      console.error("Document is not a PDF, type:", document.type);
      throw new Error("Document is not a PDF");
    }
    
    if (!document.original_url) {
      console.error("Document has no original URL");
      throw new Error("Document has no original URL");
    }
    
    console.log(`Document found: ${document.name}, getting PDF...`);
    
    // Get the PDF file
    const { data: fileData, error: fileError } = await supabase
      .storage
      .from("document_files")
      .download(`${userId}/${documentId}/original.pdf`);
    
    if (fileError) {
      console.error("Error downloading PDF:", fileError);
      throw new Error(`Failed to download PDF: ${fileError.message}`);
    }
    
    if (!fileData) {
      console.error("No PDF file data found");
      throw new Error("No PDF file found");
    }
    
    console.log(`PDF downloaded, size: ${fileData.size} bytes`);
    
    // Update progress
    await supabase
      .from("documents")
      .update({ processing_progress: 10 })
      .eq("id", documentId);
    
    // Convert the PDF to images using pdf-img-convert
    console.log("Converting PDF to images...");
    
    // First, get the total number of pages
    const pdfArrayBuffer = await fileData.arrayBuffer();
    
    // Use a try-catch here as the library might throw on malformed PDFs
    let pageCount = 0;
    try {
      pageCount = (await convert(pdfArrayBuffer, { scale: 0.1, page: 1 })).length;
      console.log(`PDF page count determined: ${pageCount} pages`);
    } catch (pageCountError) {
      console.error("Error getting page count:", pageCountError);
      throw new Error(`Failed to get PDF page count: ${pageCountError.message}`);
    }
    
    // Update document with page count immediately
    await supabase
      .from("documents")
      .update({ 
        page_count: pageCount
      })
      .eq("id", documentId);
      
    console.log(`PDF has ${pageCount} pages, beginning conversion`);
    
    // Process each page one at a time
    const thumbnails = [];
    
    for (let i = 0; i < pageCount; i++) {
      const pageNumber = i + 1;
      
      // Log the page we're processing
      console.log(`Converting page ${pageNumber} of ${pageCount}`);
      
      // Update document with current page
      await supabase
        .from("documents")
        .update({ 
          processing_progress: 10 + Math.floor((i / pageCount) * 80),
          processing_error: null
        })
        .eq("id", documentId);
      
      // Update processing log for this page
      await supabase
        .from("processing_logs")
        .insert({
          document_id: documentId,
          action: "Page Processing",
          status: "success",
          message: `Converting page ${pageNumber} of ${pageCount}`
        });
      
      // Convert this specific page
      const pageOptions = {
        scale: 1.5,      // Scale factor for image quality
        width: 1000,     // Max width
        height: 1400,    // Max height 
        format: "jpg",   // jpg format
        quality: 90,     // Image quality
        page: pageNumber // Process only this page
      };
      
      try {
        // Convert just this page
        const pageData = await convert(pdfArrayBuffer, pageOptions);
        
        if (!pageData || pageData.length === 0) {
          console.warn(`No data for page ${pageNumber}`);
          continue;
        }
        
        const jpgData = pageData[0]; // We only requested one page
        
        // Convert base64 string to a file
        const base64Data = jpgData.toString("base64");
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let j = 0; j < byteCharacters.length; j++) {
          byteNumbers[j] = byteCharacters.charCodeAt(j);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "image/jpeg" });
        
        // Upload the page image to storage
        const filePath = `${userId}/${documentId}/page_${pageNumber}.jpg`;
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from("document_files")
          .upload(filePath, blob, {
            contentType: "image/jpeg",
            upsert: true,
          });
        
        if (uploadError) {
          console.error(`Error uploading page ${pageNumber}:`, uploadError);
          await supabase.from("processing_logs").insert({
            document_id: documentId,
            action: "Page Upload Error",
            status: "error",
            message: `Failed to upload page ${pageNumber}: ${uploadError.message}`
          });
          continue;
        }
        
        // Get the public URL for the image
        const { data: publicUrlData } = await supabase
          .storage
          .from("document_files")
          .getPublicUrl(filePath);
        
        if (publicUrlData && publicUrlData.publicUrl) {
          thumbnails.push(publicUrlData.publicUrl);
          
          // Create or update the document page record
          const { error: pageError } = await supabase
            .from("document_pages")
            .upsert({
              document_id: documentId,
              page_number: pageNumber,
              image_url: publicUrlData.publicUrl,
            }, {
              onConflict: "document_id,page_number",
              ignoreDuplicates: false,
            });
          
          if (pageError) {
            console.error(`Error saving page ${pageNumber} record:`, pageError);
          }
          
          // Report success for each processed page
          await supabase.from("processing_logs").insert({
            document_id: documentId,
            action: "Page Processed",
            status: "success",
            message: `Completed page ${pageNumber} of ${pageCount}`
          });
        }
      } catch (pageError) {
        console.error(`Error processing page ${pageNumber}:`, pageError);
        await supabase.from("processing_logs").insert({
          document_id: documentId,
          action: "Page Processing Error",
          status: "error",
          message: `Error on page ${pageNumber}: ${pageError.message || 'Unknown error'}`
        });
      }
    }
    
    console.log(`Successfully processed ${thumbnails.length} of ${pageCount} pages`);
    
    // Update document status to processed
    await supabase
      .from("documents")
      .update({
        status: "processed",
        processing_progress: 100,
        page_count: pageCount
      })
      .eq("id", documentId);
    
    // Log success
    await supabase.from("processing_logs").insert({
      document_id: documentId,
      action: "PDF Conversion Complete",
      status: "success",
      message: `Successfully converted ${pageCount} pages to JPG images`
    });
    
    return new Response(
      JSON.stringify({
        success: true,
        pageCount: pageCount,
        thumbnails: thumbnails,
      }),
      { headers, status: 200 }
    );

  } catch (error) {
    console.error("Error in PDF conversion:", error);
    
    // Prepare detailed error information
    const errorDetails = {
      message: error.message || "Unknown error",
      stack: error.stack || "No stack trace",
      name: error.name,
      code: error.code,
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
          action: "PDF Conversion Failed",
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
