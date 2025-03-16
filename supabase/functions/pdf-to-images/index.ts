
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import * as pdfjs from "https://cdn.skypack.dev/pdfjs-dist@3.4.120/build/pdf.min.js";

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
    const { documentId, userId } = await req.json();

    if (!documentId) {
      throw new Error("Document ID is required");
    }

    if (!userId) {
      throw new Error("User ID is required");
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

    // Update document status to processing
    await supabase
      .from("documents")
      .update({
        status: "processing",
        processing_progress: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId);

    // Download the PDF from storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from("document_files")
      .download(`${userId}/${documentId}/${document.name}`);

    if (fileError) {
      throw new Error(`Failed to download PDF: ${fileError.message}`);
    }

    // Initialize the PDF.js worker
    pdfjs.GlobalWorkerOptions.workerSrc = "https://cdn.skypack.dev/pdfjs-dist@3.4.120/build/pdf.worker.min.js";

    // Load the PDF document
    const pdfData = new Uint8Array(await fileData.arrayBuffer());
    const pdf = await pdfjs.getDocument({ data: pdfData }).promise;
    const numPages = pdf.numPages;

    console.log(`PDF has ${numPages} pages, starting page extraction`);

    // Process each page
    const pages = [];
    for (let i = 1; i <= numPages; i++) {
      console.log(`Processing page ${i} of ${numPages}`);
      
      // Update progress
      await supabase
        .from("documents")
        .update({
          processing_progress: (i / numPages) * 100,
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId);
      
      // Log page extraction
      await supabase.from("processing_logs").insert({
        document_id: documentId,
        action: `Page ${i} Extraction`,
        status: "success",
        message: `Extracting image from page ${i}`,
      });

      // Get the page
      const page = await pdf.getPage(i);
      
      // Set the scale for rendering (adjust as needed for desired quality)
      const scale = 1.5;
      const viewport = page.getViewport({ scale });
      
      // Create a canvas for rendering
      const canvas = new OffscreenCanvas(viewport.width, viewport.height);
      const context = canvas.getContext("2d");
      
      // Render the page to the canvas
      await page.render({
        canvasContext: context,
        viewport,
      }).promise;
      
      // Convert canvas to PNG
      const imageBlob = await canvas.convertToBlob({ type: "image/png" });
      const imageName = `page_${i}.png`;
      
      // Upload the image to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("document_images")
        .upload(`${userId}/${documentId}/${imageName}`, imageBlob, {
          contentType: "image/png",
          upsert: true,
        });
      
      if (uploadError) {
        throw new Error(`Failed to upload page image: ${uploadError.message}`);
      }
      
      // Get the public URL
      const { data: imagePublicUrlData } = supabase.storage
        .from("document_images")
        .getPublicUrl(`${userId}/${documentId}/${imageName}`);
      
      // Create page record
      const { data: pageData, error: pageError } = await supabase
        .from("document_pages")
        .insert({
          document_id: documentId,
          page_number: i,
          image_url: imagePublicUrlData.publicUrl,
        })
        .select()
        .single();
      
      if (pageError) {
        throw new Error(`Failed to create page record: ${pageError.message}`);
      }
      
      pages.push(pageData);
      
      // Log page extraction completion
      await supabase.from("processing_logs").insert({
        document_id: documentId,
        action: `Page ${i} Extraction`,
        status: "success",
        message: `Successfully extracted image from page ${i}`,
      });
    }

    // Update document status and page count
    await supabase
      .from("documents")
      .update({
        status: "processed",
        page_count: numPages,
        processing_progress: 100,
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId);

    // Log processing completion
    await supabase.from("processing_logs").insert({
      document_id: documentId,
      action: "PDF to Images Conversion",
      status: "success",
      message: `Successfully converted PDF to ${numPages} images`,
    });

    console.log(`PDF conversion completed for document ID: ${documentId}`);
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully converted PDF to ${numPages} images`,
        pages,
        pageCount: numPages
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
