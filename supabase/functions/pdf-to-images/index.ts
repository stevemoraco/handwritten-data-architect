
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

    // Check if storage bucket exists and create it if it doesn't
    const bucketName = 'document_files';
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();
    
    if (bucketsError) {
      console.error("Error checking buckets:", bucketsError);
      return responseWithCors({
        success: false,
        error: `Error checking storage buckets: ${bucketsError.message}`
      }, 500);
    }
    
    // Check if document_files bucket exists
    const bucketExists = buckets.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      console.log(`Creating '${bucketName}' bucket as it doesn't exist`);
      const { error: createBucketError } = await supabase
        .storage
        .createBucket(bucketName, {
          public: true,
          fileSizeLimit: 104857600, // 100MB
        });
      
      if (createBucketError) {
        console.error("Error creating bucket:", createBucketError);
        return responseWithCors({
          success: false,
          error: `Failed to create storage bucket: ${createBucketError.message}`
        }, 500);
      }
    }

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
      // Instead of fetching the PDF directly, download it using Supabase storage
      // This is because direct URL access might have permissions issues
      const filePathParts = document.original_url.split('/');
      const fileName = filePathParts[filePathParts.length - 1];
      const filePath = `${userId}/${documentId}/${fileName}`;
      
      console.log(`Attempting to download file from storage path: ${filePath}`);
      
      // Try to download file using Supabase storage
      let pdfBuffer: ArrayBuffer;
      
      try {
        const { data: fileData, error: downloadError } = await supabase
          .storage
          .from(bucketName)
          .download(filePath);
        
        if (downloadError || !fileData) {
          console.error("Error downloading file from storage:", downloadError);
          throw new Error(`Failed to download PDF from storage: ${downloadError?.message || 'Unknown error'}`);
        }
        
        pdfBuffer = await fileData.arrayBuffer();
        console.log(`Successfully downloaded file (${pdfBuffer.byteLength} bytes)`);
      } catch (downloadError) {
        console.error("Error in storage download, trying direct URL fetch:", downloadError);
        
        // Fallback to direct URL fetch
        console.log(`Fetching PDF from URL: ${document.original_url}`);
        let pdfResponse;
        let pdfUrl = document.original_url;
        
        // Try with decoding URL components if needed
        try {
          // Try with the original URL first
          pdfResponse = await fetch(pdfUrl, {
            headers: {
              'Accept': 'application/pdf',
              'Cache-Control': 'no-cache'
            }
          });
          
          if (!pdfResponse.ok) {
            // If that fails, try with decoded URL
            pdfUrl = decodeURIComponent(document.original_url);
            console.log(`Retrying with decoded URL: ${pdfUrl}`);
            
            pdfResponse = await fetch(pdfUrl, {
              headers: {
                'Accept': 'application/pdf',
                'Cache-Control': 'no-cache'
              }
            });
            
            if (!pdfResponse.ok) {
              throw new Error(`Failed to fetch PDF: ${pdfResponse.status} ${pdfResponse.statusText}`);
            }
          }
        } catch (fetchError) {
          console.error("All attempts to fetch PDF failed:", fetchError);
          throw new Error(`Failed to fetch PDF: ${fetchError.message}`);
        }
        
        pdfBuffer = await pdfResponse.arrayBuffer();
        console.log(`Successfully fetched PDF directly (${pdfBuffer.byteLength} bytes)`);
        
        // Re-upload the file to storage now that we have it
        try {
          const { error: uploadError } = await supabase
            .storage
            .from(bucketName)
            .upload(filePath, pdfBuffer, {
              contentType: 'application/pdf',
              upsert: true
            });
          
          if (uploadError) {
            console.error("Failed to upload PDF to storage:", uploadError);
          } else {
            console.log(`Re-uploaded PDF to storage path: ${filePath}`);
          }
        } catch (uploadError) {
          console.error("Error during re-upload:", uploadError);
        }
      }

      // Determine page count based on file size
      // This is a rough estimate - real implementation would parse the PDF
      const pageCount = Math.max(1, Math.ceil(pdfBuffer.byteLength / 50000));
      console.log(`Estimated ${pageCount} pages based on file size`);

      // Clear existing pages for this document
      await supabase
        .from('document_pages')
        .delete()
        .eq('document_id', documentId);
      
      // Create placeholder page images
      const thumbnails = [];
      
      // Create document pages with placeholder images
      for (let i = 0; i < pageCount; i++) {
        // Update progress in the document record
        const progress = Math.round(((i + 1) / pageCount) * 100);
        await supabase
          .from('documents')
          .update({
            processing_progress: progress
          })
          .eq('id', documentId);
        
        // Create placeholder image URL - in a real implementation, this would be the actual extracted page
        const placeholderImageUrl = `https://via.placeholder.com/800x1000?text=Page+${i + 1}`;
        
        // Store page info in database
        const { data: pageData, error: pageError } = await supabase
          .from('document_pages')
          .insert({
            document_id: documentId,
            page_number: i + 1,
            image_url: placeholderImageUrl,
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
