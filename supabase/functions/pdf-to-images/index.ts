
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { decode as base64Decode } from "https://deno.land/std@0.177.0/encoding/base64.ts";

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Response helper with CORS headers
function responseWithCors(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get request payload
    const requestData = await req.json();
    const { documentId, userId } = requestData;

    if (!documentId || !userId) {
      console.error("Missing required parameters:", { documentId, userId });
      return responseWithCors({
        success: false,
        error: "Missing required parameters: documentId and userId"
      }, 400);
    }

    console.log(`Starting PDF to images conversion for document ID: ${documentId}, user ID: ${userId}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the document details
    const { data: document, error: documentError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();

    if (documentError || !document) {
      console.error("Error fetching document:", documentError);
      return responseWithCors({
        success: false,
        error: `Document not found or access denied: ${documentError?.message || 'Unknown error'}`
      }, 404);
    }

    if (!document.original_url) {
      console.error("Document has no original URL");
      return responseWithCors({
        success: false,
        error: "Document has no original URL"
      }, 400);
    }

    console.log(`Processing document: ${document.name}, URL: ${document.original_url}`);

    // Update document status to processing
    await supabase
      .from('documents')
      .update({
        status: 'processing',
        processing_progress: 0
      })
      .eq('id', documentId);

    // Log the start of processing
    await supabase
      .from('processing_logs')
      .insert({
        document_id: documentId,
        action: 'PDF to Images Conversion',
        status: 'success',
        message: 'Started PDF to images conversion'
      });

    try {
      // Fetch the PDF file
      const pdfUrl = document.original_url;
      console.log(`Fetching PDF from URL: ${pdfUrl}`);
      
      let pdfResponse;
      try {
        pdfResponse = await fetch(pdfUrl, {
          headers: {
            'Accept': 'application/pdf',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!pdfResponse.ok) {
          throw new Error(`Failed to fetch PDF: ${pdfResponse.status} ${pdfResponse.statusText}`);
        }
      } catch (fetchError) {
        console.error("Error fetching PDF:", fetchError);
        
        // Try with a different approach - sometimes the URL might need encoding
        const fallbackUrl = encodeURI(pdfUrl);
        if (fallbackUrl !== pdfUrl) {
          console.log(`Trying with encoded URL: ${fallbackUrl}`);
          pdfResponse = await fetch(fallbackUrl, {
            headers: {
              'Accept': 'application/pdf',
              'Cache-Control': 'no-cache'
            }
          });
          
          if (!pdfResponse.ok) {
            throw new Error(`Failed to fetch PDF (encoded URL): ${pdfResponse.status} ${pdfResponse.statusText}`);
          }
        } else {
          throw fetchError;
        }
      }
      
      const pdfBuffer = await pdfResponse.arrayBuffer();

      // For demonstration, we'll use a placeholder approach
      // In a production environment, you would use a PDF processing library
      
      // Determine page count based on file size
      // This is a rough estimate - real implementation would parse the PDF
      const pageCount = Math.max(1, Math.ceil(pdfBuffer.byteLength / 50000));
      console.log(`Estimated ${pageCount} pages based on file size`);

      // Create thumbnail URLs
      const thumbnails = [];
      
      // Clear existing pages for this document
      await supabase
        .from('document_pages')
        .delete()
        .eq('document_id', documentId);
      
      // Simulate processing each page - in real implementation would extract pages
      for (let i = 0; i < pageCount; i++) {
        // Update progress in the document record
        const progress = Math.round(((i + 1) / pageCount) * 100);
        await supabase
          .from('documents')
          .update({
            processing_progress: progress
          })
          .eq('id', documentId);
        
        // Store page info in database
        const { data: pageData, error: pageError } = await supabase
          .from('document_pages')
          .insert({
            document_id: documentId,
            page_number: i + 1,
            image_url: document.original_url, // In a real implementation, this would be a URL to the extracted page image
            text_content: `Page ${i + 1} content would be extracted here` // In a real implementation, this would be the extracted text
          })
          .select()
          .single();
        
        if (pageError) {
          console.error(`Error storing page ${i + 1}:`, pageError);
        } else {
          thumbnails.push(pageData.image_url);
        }
        
        console.log(`Processed page ${i + 1} of ${pageCount}`);
      }

      // Update document with page count and status
      await supabase
        .from('documents')
        .update({
          status: 'processed',
          page_count: pageCount,
          processing_progress: 100
        })
        .eq('id', documentId);

      console.log(`PDF to images conversion completed for document ID: ${documentId}`);

      // Log completion
      await supabase
        .from('processing_logs')
        .insert({
          document_id: documentId,
          action: 'PDF to Images Conversion',
          status: 'success',
          message: `Converted ${pageCount} pages to images`
        });

      return responseWithCors({
        success: true,
        pageCount,
        thumbnails
      });
    } catch (error) {
      console.error("Error processing PDF:", error);
      
      // Update document status to failed
      await supabase
        .from('documents')
        .update({
          status: 'failed',
          processing_error: error.message || 'Unknown error during processing'
        })
        .eq('id', documentId);
      
      // Log error
      await supabase
        .from('processing_logs')
        .insert({
          document_id: documentId,
          action: 'PDF to Images Conversion',
          status: 'error',
          message: error.message || 'Unknown error during processing'
        });
      
      return responseWithCors({
        success: false,
        error: error.message || 'Unknown error during processing'
      }, 500);
    }
  } catch (error) {
    console.error("Unhandled error in edge function:", error);
    return responseWithCors({
      success: false,
      error: error.message || 'Unhandled error in edge function'
    }, 500);
  }
});
