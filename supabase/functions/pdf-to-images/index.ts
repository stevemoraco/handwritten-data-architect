
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.8.0";
import * as pdfjs from "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/+esm";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/+esm';

serve(async (req) => {
  // Handle CORS requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env variables')
    }
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false
      }
    })

    // Get documentId and userId from request body
    const { documentId, userId } = await req.json()
    if (!documentId || !userId) {
      throw new Error('Missing documentId or userId in request body')
    }

    // Process the PDF
    const { pageCount, thumbnails } = await processPdf(supabase, userId, documentId);

    return new Response(
      JSON.stringify({ success: true, pageCount, thumbnails }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error processing PDF:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

async function processPdf(supabase, userId, documentId) {
  try {
    console.log(`Processing PDF for document: ${documentId}`);
    
    // Initialize variables
    const thumbnails = [];
    let pageCount = 0;
    
    console.log("Downloading the PDF file...");
    
    // Get document record to access the URL
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("original_url, url, name")
      .eq("id", documentId)
      .single();
      
    if (docError || !document) {
      throw new Error(`Failed to get document: ${docError?.message || "Document not found"}`);
    }
    
    // Get the PDF URL directly from the document record
    const pdfUrl = document.original_url || document.url;
    if (!pdfUrl) {
      throw new Error("No document URL available");
    }
    
    console.log(`Document URL: ${pdfUrl}`);
    
    // For Supabase storage, extract the path from the URL
    // The URL format is: https://{projectId}.supabase.co/storage/v1/object/public/document_files/{path}
    const pathMatch = pdfUrl.match(/document_files\/(.+)$/);
    if (!pathMatch || !pathMatch[1]) {
      throw new Error(`Invalid document URL format: ${pdfUrl}`);
    }
    
    const pdfPath = decodeURIComponent(pathMatch[1]);
    console.log(`Extracted PDF path: ${pdfPath}`);
    
    // Download the PDF file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("document_files")
      .download(pdfPath);

    if (downloadError) {
      throw new Error(`Failed to download PDF: ${downloadError.message}`);
    }

    if (!fileData) {
      throw new Error("PDF file data is null");
    }

    console.log("PDF file downloaded successfully.");

    // Load the PDF document
    console.log("Loading the PDF document...");
    const pdf = await pdfjs.getDocument({ data: await fileData.arrayBuffer() }).promise;
    pageCount = pdf.numPages;
    console.log(`PDF loaded with ${pageCount} pages.`);

    // Generate thumbnails for each page
    console.log("Generating thumbnails...");
    for (let i = 1; i <= pageCount; i++) {
      try {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.2 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport,
        }).promise;

        const dataUrl = canvas.toDataURL("image/jpeg");
        thumbnails.push(dataUrl);
        console.log(`Thumbnail generated for page ${i}`);
      } catch (thumbnailError) {
        console.error(`Error generating thumbnail for page ${i}:`, thumbnailError);
        // Continue with the next page, but log the error
      }
    }

    console.log("Thumbnails generated successfully.");

    // Update the document in the database with thumbnails and page count
    console.log("Updating document in database...");
    const { error: updateError } = await supabase
      .from("documents")
      .update({
        page_count: pageCount,
        thumbnails: thumbnails,
        status: 'processed'
      })
      .eq("id", documentId);

    if (updateError) {
      throw new Error(`Failed to update document: ${updateError.message}`);
    }

    console.log("Document updated successfully.");

    return { pageCount, thumbnails };
  }
  catch (error) {
    console.error("Error in processPdf:", error);

    // Log the error to the database
    await supabase.from("processing_logs").insert({
      document_id: documentId,
      action: "PDF Conversion",
      status: "error",
      message: error.message
    });

    // Update the document status to failed
    await supabase.from("documents").update({
      status: "failed",
      processing_error: error.message
    }).eq("id", documentId);

    throw error;
  }
}
