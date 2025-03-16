
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
      .select("original_url, url, name, user_id")
      .eq("id", documentId)
      .single();
      
    if (docError || !document) {
      throw new Error(`Failed to get document: ${docError?.message || "Document not found"}`);
    }
    
    // First try direct download using the URL from the document
    let fileData;
    let downloadError;
    
    // Try both URLs if available
    if (document.original_url) {
      try {
        console.log(`Attempting to download from original_url: ${document.original_url}`);
        const response = await fetch(document.original_url);
        if (response.ok) {
          fileData = await response.arrayBuffer();
          console.log("Downloaded from original_url successfully");
        } else {
          console.log(`Failed to download from original_url: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.log(`Error downloading from original_url: ${error.message}`);
      }
    }
    
    // Try with URL if original_url failed
    if (!fileData && document.url && document.url !== document.original_url) {
      try {
        console.log(`Attempting to download from url: ${document.url}`);
        const response = await fetch(document.url);
        if (response.ok) {
          fileData = await response.arrayBuffer();
          console.log("Downloaded from url successfully");
        } else {
          console.log(`Failed to download from url: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.log(`Error downloading from url: ${error.message}`);
      }
    }
    
    // If direct URL download failed, try using storage API with different path strategies
    if (!fileData) {
      // Try strategy 1: Document ID path
      const idBasedPath = `${document.user_id || userId}/${documentId}/original.pdf`;
      console.log(`Attempting to download using ID-based path: ${idBasedPath}`);
      
      try {
        const { data: idPathData, error: idPathError } = await supabase.storage
          .from("document_files")
          .download(idBasedPath);
          
        if (idPathError) {
          console.log(`Error downloading with ID path: ${idPathError.message}`);
        } else if (idPathData) {
          fileData = await idPathData.arrayBuffer();
          console.log("Downloaded using ID-based path successfully");
          
          // Update the document record with the correct URL
          const { data: urlData } = supabase.storage
            .from("document_files")
            .getPublicUrl(idBasedPath);
            
          if (urlData?.publicUrl) {
            await supabase
              .from("documents")
              .update({ 
                original_url: urlData.publicUrl,
                url: urlData.publicUrl 
              })
              .eq("id", documentId);
          }
        }
      } catch (error) {
        console.log(`Error in ID-based download: ${error.message}`);
      }
    }
    
    // Try strategy 2: Name-based path if ID-based failed
    if (!fileData) {
      const encodedFilename = encodeURIComponent(document.name);
      const nameBasedPath = `${document.user_id || userId}/uploads/${encodedFilename}`;
      console.log(`Attempting to download using name-based path: ${nameBasedPath}`);
      
      try {
        const { data: namePathData, error: namePathError } = await supabase.storage
          .from("document_files")
          .download(nameBasedPath);
          
        if (namePathError) {
          console.log(`Error downloading with name path: ${namePathError.message}`);
        } else if (namePathData) {
          fileData = await namePathData.arrayBuffer();
          console.log("Downloaded using name-based path successfully");
          
          // Update the document record with the correct URL
          const { data: urlData } = supabase.storage
            .from("document_files")
            .getPublicUrl(nameBasedPath);
            
          if (urlData?.publicUrl) {
            await supabase
              .from("documents")
              .update({ 
                original_url: urlData.publicUrl,
                url: urlData.publicUrl 
              })
              .eq("id", documentId);
          }
        }
      } catch (error) {
        console.log(`Error in name-based download: ${error.message}`);
      }
    }

    if (!fileData) {
      throw new Error("Could not download PDF file using any strategy");
    }

    console.log("PDF file downloaded successfully.");

    // Load the PDF document
    console.log("Loading the PDF document...");
    const pdf = await pdfjs.getDocument({ data: fileData }).promise;
    pageCount = pdf.numPages;
    console.log(`PDF loaded with ${pageCount} pages.`);

    // Generate thumbnails for each page
    console.log("Generating thumbnails...");
    for (let i = 1; i <= pageCount; i++) {
      try {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.2 });
        const canvas = new OffscreenCanvas(viewport.width, viewport.height);
        const context = canvas.getContext("2d");
        
        if (!context) {
          throw new Error("Failed to get canvas context");
        }

        await page.render({
          canvasContext: context,
          viewport,
        }).promise;

        const imageData = context.getImageData(0, 0, viewport.width, viewport.height);
        const buffer = imageData.data.buffer;
        
        // Save the page image to storage
        const pagePath = `${document.user_id || userId}/${documentId}/pages/page-${i}.jpg`;
        
        const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 });
        const arrayBuffer = await blob.arrayBuffer();
        
        const { error: pageUploadError } = await supabase.storage
          .from("document_files")
          .upload(pagePath, arrayBuffer, {
            contentType: "image/jpeg",
            upsert: true
          });
          
        if (pageUploadError) {
          console.error(`Error uploading page ${i} image:`, pageUploadError);
          continue;
        }
        
        // Get the URL for the uploaded page image
        const { data: pageUrlData } = supabase.storage
          .from("document_files")
          .getPublicUrl(pagePath);
          
        if (pageUrlData?.publicUrl) {
          thumbnails.push(pageUrlData.publicUrl);
          
          // Create or update the document page record
          await supabase.from("document_pages").upsert({
            document_id: documentId,
            page_number: i,
            image_url: pageUrlData.publicUrl
          }, { onConflict: 'document_id,page_number' });
          
          console.log(`Page ${i} processed and saved`);
        }
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
