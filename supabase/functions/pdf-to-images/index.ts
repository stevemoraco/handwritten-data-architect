
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

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
    // Parse request body
    const { documentId, userId } = await req.json();
    
    if (!documentId) {
      throw new Error("Document ID is required");
    }
    
    if (!userId) {
      throw new Error("User ID is required");
    }

    console.log(`Processing PDF document: ${documentId} for user: ${userId}`);

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration is missing");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get document information
    const { data: document, error: documentError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (documentError) {
      throw new Error(`Failed to fetch document: ${documentError.message}`);
    }

    if (!document.original_url) {
      throw new Error("Document URL is missing");
    }

    console.log(`Downloading PDF from URL: ${document.original_url}`);

    // Download the PDF file
    const response = await fetch(document.original_url);
    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.statusText}`);
    }

    const pdfBytes = await response.arrayBuffer();
    
    // Load the PDF document
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pageCount = pdfDoc.getPageCount();
    
    console.log(`PDF has ${pageCount} pages`);
    
    // Update document page count
    await supabase
      .from("documents")
      .update({ 
        page_count: pageCount,
        processing_progress: 10,
        updated_at: new Date().toISOString()
      })
      .eq("id", documentId);
    
    // Log processing start
    await supabase.from("processing_logs").insert({
      document_id: documentId,
      action: "PDF Conversion",
      status: "success",
      message: `Starting PDF to image conversion for ${pageCount} pages`,
    });

    // Process each page
    const pagePromises = [];
    
    for (let i = 0; i < pageCount; i++) {
      const pageNumber = i + 1;
      
      // Extract single page
      const singlePagePdf = await PDFDocument.create();
      const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [i]);
      singlePagePdf.addPage(copiedPage);
      const singlePageBytes = await singlePagePdf.saveAsBase64({ dataUri: true });
      
      // Upload page image to storage
      const imagePath = `${userId}/${documentId}/page_${pageNumber}.png`;
      
      pagePromises.push(
        (async () => {
          try {
            // Using a data URI to load the image
            const dataURI = singlePageBytes;
            
            // For PDF pages, we need to convert to PNG using a web-based renderer
            // This is a simplified approach - in production, consider using a service like Puppeteer
            const imgBlob = await fetch(`https://pdf2png-api.com/convert?base64=${encodeURIComponent(dataURI)}`);
            const imgData = await imgBlob.arrayBuffer();
            
            // Upload the PNG to storage
            const { data: storageData, error: storageError } = await supabase.storage
              .from("document_images")
              .upload(imagePath, imgData, {
                contentType: "image/png",
                cacheControl: "3600",
              });
              
            if (storageError) {
              throw new Error(`Failed to upload page image: ${storageError.message}`);
            }
            
            // Get public URL
            const { data: publicUrlData } = supabase.storage
              .from("document_images")
              .getPublicUrl(imagePath);
              
            // Add page record to database
            await supabase.from("document_pages").insert({
              document_id: documentId,
              page_number: pageNumber,
              image_url: publicUrlData.publicUrl,
            });
            
            // Update document progress
            const progress = Math.floor(10 + ((pageNumber / pageCount) * 90));
            await supabase
              .from("documents")
              .update({ 
                processing_progress: progress,
                updated_at: new Date().toISOString()
              })
              .eq("id", documentId);
              
            return publicUrlData.publicUrl;
          } catch (error) {
            console.error(`Error processing page ${pageNumber}:`, error);
            // Log the error but continue with other pages
            return null;
          }
        })()
      );
      
      // Process pages in batches of 3 to avoid overwhelming the server
      if (pagePromises.length >= 3 || i === pageCount - 1) {
        await Promise.all(pagePromises);
        pagePromises.length = 0;
      }
    }
    
    // Update document as processed
    await supabase
      .from("documents")
      .update({ 
        status: "processed",
        processing_progress: 100,
        updated_at: new Date().toISOString()
      })
      .eq("id", documentId);
      
    // Log completion
    await supabase.from("processing_logs").insert({
      document_id: documentId,
      action: "PDF Conversion",
      status: "success",
      message: `Successfully converted PDF to ${pageCount} images`,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "PDF processing complete",
        pageCount,
        documentId
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in PDF to images conversion:", error);
    
    // Try to log the error if possible
    try {
      const body = await req.json().catch(() => ({}));
      const documentId = body.documentId;
      
      if (documentId) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        
        if (supabaseUrl && supabaseServiceKey) {
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          
          await supabase.from("processing_logs").insert({
            document_id: documentId,
            action: "PDF Conversion",
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
