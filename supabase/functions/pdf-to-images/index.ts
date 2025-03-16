
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.8.0";
import { convert } from "https://esm.sh/pdf-img-convert@1.2.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

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
    // Parse request body
    const { documentId, userId } = await req.json();

    if (!documentId || !userId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing documentId or userId"
        }),
        { headers, status: 400 }
      );
    }

    console.log(`Processing PDF to images for document: ${documentId}, user: ${userId}`);
    
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
        processing_progress: 10,
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
      throw new Error(`Document not found: ${docError.message}`);
    }
    
    if (document.type !== "pdf") {
      throw new Error("Document is not a PDF");
    }
    
    if (!document.original_url) {
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
      throw new Error("No PDF file found");
    }
    
    console.log(`PDF downloaded, size: ${fileData.size} bytes`);
    
    // Update progress
    await supabase
      .from("documents")
      .update({ processing_progress: 20 })
      .eq("id", documentId);
    
    // Convert the PDF to images using pdf-img-convert
    console.log("Converting PDF to images...");
    const pages = await convert(await fileData.arrayBuffer(), {
      scale: 1.5,     // Scale factor for image quality
      width: 1000,     // Max width
      height: 1400,    // Max height
      format: "jpg",  // jpg format
      quality: 90,    // Image quality
    });
    
    console.log(`Converted ${pages.length} pages`);
    
    // Update progress
    await supabase
      .from("documents")
      .update({ 
        processing_progress: 40,
        page_count: pages.length
      })
      .eq("id", documentId);
    
    // Process each page
    const thumbnails = [];
    
    for (let i = 0; i < pages.length; i++) {
      const pageNumber = i + 1;
      const jpgData = pages[i];
      
      if (!jpgData) {
        console.warn(`No data for page ${pageNumber}`);
        continue;
      }
      
      console.log(`Processing page ${pageNumber}/${pages.length}`);
      
      // Convert base64 string to a file
      const base64Data = jpgData.toString("base64");
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
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
      }
      
      // Update progress
      const progressPercentage = Math.min(40 + Math.round(50 * (i + 1) / pages.length), 90);
      await supabase
        .from("documents")
        .update({ processing_progress: progressPercentage })
        .eq("id", documentId);
    }
    
    console.log(`Uploaded ${thumbnails.length} page images`);
    
    // Update document status to processed
    await supabase
      .from("documents")
      .update({
        status: "processed",
        processing_progress: 100,
        page_count: pages.length
      })
      .eq("id", documentId);
    
    // Log success
    await supabase.from("processing_logs").insert({
      document_id: documentId,
      action: "PDF Conversion Complete",
      status: "success",
      message: `Successfully converted ${pages.length} pages to JPG images`
    });
    
    return new Response(
      JSON.stringify({
        success: true,
        pageCount: pages.length,
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
