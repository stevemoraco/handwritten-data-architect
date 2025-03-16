import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.8.0";
import * as pdfjs from "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/+esm";

// Set worker source for PDF.js
const pdfjsWorker = await import("https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.mjs");
globalThis.pdfjsWorker = pdfjsWorker;

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
    
    console.log("Downloading the PDF file...");
    
    // Get the file path from the document URL
    // This is critical - we need to extract the path from the URL that works
    let pdfUrl = document.original_url || document.url;
    if (!pdfUrl) {
      throw new Error("No document URL available");
    }
    
    console.log(`Document URL: ${pdfUrl}`);
    
    // Extract the path from the URL
    // Format is like: https://...supabase.co/storage/v1/object/public/document_files/userId/temp/docId/filename.pdf
    let pathParts = pdfUrl.split('document_files/')[1];
    if (!pathParts) {
      throw new Error("Invalid document URL format");
    }
    
    const pdfPath = pathParts;
    console.log(`Extracted PDF path: ${pdfPath}`);
    
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
    
    console.log("PDF file downloaded successfully, processing with PDF.js");
    
    // Update progress
    await supabase
      .from("documents")
      .update({
        processing_progress: 30
      })
      .eq("id", documentId);
    
    // Convert ArrayBuffer to Uint8Array for PDF.js
    const pdfData = new Uint8Array(await fileData.arrayBuffer());
    
    // Load the PDF document using PDF.js
    console.log("Loading PDF with PDF.js...");
    const loadingTask = pdfjs.getDocument({ data: pdfData });
    const pdfDocument = await loadingTask.promise;
    
    // Get the actual page count from the PDF
    const pageCount = pdfDocument.numPages;
    console.log(`PDF loaded successfully. Page count: ${pageCount}`);
    
    // Update the document with the page count
    await supabase
      .from("documents")
      .update({
        page_count: pageCount,
        processing_progress: 40
      })
      .eq("id", documentId);
    
    // Clear any existing pages
    console.log("Clearing any existing pages...");
    const { error: deleteError } = await supabase
      .from("document_pages")
      .delete()
      .eq("document_id", documentId);
    
    if (deleteError) {
      console.error(`Error clearing existing pages: ${deleteError.message}`);
    }
    
    // Create a storage folder for the page images
    const imagesFolder = `${userId}/${documentId}/pages`;
    
    console.log(`Processing ${pageCount} pages and creating images...`);
    
    // Process each page
    for (let i = 0; i < pageCount; i++) {
      const pageNumber = i + 1;
      const progressPercent = 40 + Math.floor((i / pageCount) * 50);
      
      // Update progress
      await supabase
        .from("documents")
        .update({
          processing_progress: progressPercent
        })
        .eq("id", documentId);
      
      try {
        console.log(`Rendering page ${pageNumber}...`);
        
        // Get the page
        const page = await pdfDocument.getPage(pageNumber);
        
        // Set rendering parameters
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = new OffscreenCanvas(viewport.width, viewport.height);
        const context = canvas.getContext('2d');
        
        // Render the page to canvas
        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        
        await page.render(renderContext).promise;
        
        // Convert canvas to blob
        const imageBlob = await canvas.convertToBlob({ 
          type: 'image/jpeg',
          quality: 0.8
        });
        
        // Convert Blob to ArrayBuffer for Supabase storage
        const imageArrayBuffer = await imageBlob.arrayBuffer();
        
        // Upload the image to storage
        const imagePath = `${imagesFolder}/page-${pageNumber}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("document_files")
          .upload(imagePath, imageArrayBuffer, {
            contentType: 'image/jpeg',
            cacheControl: '3600'
          });
        
        if (uploadError) {
          console.error(`Error uploading page ${pageNumber} image:`, uploadError);
          throw uploadError;
        }
        
        // Get public URL for the image
        const { data: urlData } = supabase.storage
          .from("document_files")
          .getPublicUrl(imagePath);
        
        if (!urlData || !urlData.publicUrl) {
          throw new Error(`Failed to get public URL for page ${pageNumber}`);
        }
        
        // Extract text content from the page (if available)
        let textContent = "";
        try {
          const textContent = await page.getTextContent();
          const textItems = textContent.items;
          const pageText = textItems
            .map(item => 'str' in item ? item.str : '')
            .join(' ');
            
          textContent = pageText;
        } catch (textError) {
          console.warn(`Could not extract text from page ${pageNumber}:`, textError);
          textContent = `Text extraction not available for page ${pageNumber}`;
        }
        
        // Create document page record
        await supabase.from("document_pages").insert({
          document_id: documentId,
          page_number: pageNumber,
          image_url: urlData.publicUrl,
          text_content: textContent
        });
        
        console.log(`Successfully processed page ${pageNumber}`);
      } catch (pageError) {
        console.error(`Error processing page ${pageNumber}:`, pageError);
        
        // Log the error but continue processing other pages
        await supabase.from("processing_logs").insert({
          document_id: documentId,
          action: `Page ${pageNumber} Processing Error`,
          status: "error",
          message: pageError instanceof Error ? pageError.message : "Unknown error"
        });
      }
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
            processing_error: error instanceof Error ? error.message : "Unknown error occurred"
          })
          .eq("id", documentId);
        
        // Log the error
        await supabase.from("processing_logs").insert({
          document_id: documentId,
          action: "PDF Processing Failed",
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error occurred"
        });
      }
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      }),
      { headers: corsHeaders, status: 500 }
    );
  }
});
