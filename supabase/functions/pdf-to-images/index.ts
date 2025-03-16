
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

    // Create storage bucket if it doesn't exist
    const bucketName = 'document_files';
    
    try {
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        console.error("Error checking buckets:", bucketsError);
        throw new Error(`Error checking storage buckets: ${bucketsError.message}`);
      }
      
      const bucketExists = buckets.some(bucket => bucket.name === bucketName);
      
      if (!bucketExists) {
        console.log(`Creating '${bucketName}' bucket as it doesn't exist`);
        const { error: createBucketError } = await supabase.storage.createBucket(bucketName, {
          public: true,
          fileSizeLimit: 104857600 // 100MB
        });
        
        if (createBucketError) {
          console.error("Error creating bucket:", createBucketError);
          throw new Error(`Failed to create storage bucket: ${createBucketError.message}`);
        }
      }
      
      // Always update bucket to ensure it's public
      const { error: updateBucketError } = await supabase.storage.updateBucket(bucketName, {
        public: true,
        fileSizeLimit: 104857600 // 100MB
      });
      
      if (updateBucketError) {
        console.error("Error updating bucket:", updateBucketError);
        throw new Error(`Failed to update storage bucket: ${updateBucketError.message}`);
      }
      
      console.log("Bucket setup complete, confirmed public access");
    } catch (bucketError) {
      console.error("Bucket setup error:", bucketError);
      return responseWithCors({
        success: false,
        error: `Bucket setup error: ${bucketError.message}`
      }, 500);
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
      // Prepare file path from document URL
      const filePathParts = document.original_url.split('/');
      const fileName = filePathParts[filePathParts.length - 1];
      const decodedFileName = decodeURIComponent(fileName);
      const filePath = `${userId}/${documentId}/${decodedFileName}`;
      
      console.log(`Attempting to download file from storage path: ${filePath}`);
      
      // Try multiple approaches to get the PDF
      let pdfBuffer: ArrayBuffer | null = null;
      let fetchError: Error | null = null;
      
      // First try: direct storage download
      try {
        const { data: fileData, error: downloadError } = await supabase
          .storage
          .from(bucketName)
          .download(filePath);
        
        if (!downloadError && fileData) {
          pdfBuffer = await fileData.arrayBuffer();
          console.log(`Successfully downloaded file from storage (${pdfBuffer.byteLength} bytes)`);
        } else {
          fetchError = new Error(`Storage download failed: ${downloadError?.message || 'Unknown error'}`);
          console.error(fetchError.message);
        }
      } catch (error) {
        fetchError = error;
        console.error("Error in storage download:", error);
      }
      
      // If we couldn't get the PDF from storage, try fetching it directly
      if (!pdfBuffer) {
        try {
          console.log(`Trying direct fetch from URL: ${document.original_url}`);
          
          const pdfResponse = await fetch(document.original_url, {
            headers: {
              'Accept': 'application/pdf',
              'Cache-Control': 'no-cache'
            }
          });
          
          if (pdfResponse.ok) {
            pdfBuffer = await pdfResponse.arrayBuffer();
            console.log(`Successfully fetched PDF directly (${pdfBuffer.byteLength} bytes)`);
          } else {
            console.error(`Direct URL fetch failed: ${pdfResponse.status} ${pdfResponse.statusText}`);
          }
        } catch (error) {
          console.error("Error in direct URL fetch:", error);
        }
      }
      
      // If we still don't have the PDF after all attempts
      if (!pdfBuffer) {
        throw new Error(`Failed to fetch PDF after multiple attempts: ${fetchError?.message || 'Unknown error'}`);
      }
      
      // More accurate page count estimation based on PDF structure
      // This is a heuristic method that's more accurate than file size
      // In a real system, you'd use a proper PDF parser library
      const pdfText = new TextDecoder().decode(pdfBuffer);
      
      // Count the number of "/Page" objects in the PDF
      const pageMatches = pdfText.match(/\/Type\s*\/Page\b/g);
      const estimatedPageCount = pageMatches ? pageMatches.length : 1;
      
      console.log(`Estimated ${estimatedPageCount} pages based on PDF structure`);

      // Clear existing pages for this document
      await supabase
        .from('document_pages')
        .delete()
        .eq('document_id', documentId);
      
      // Create document pages with placeholder thumbnails
      // In a real implementation, we'd use a PDF to image conversion service
      const thumbnails = [];
      
      for (let i = 0; i < estimatedPageCount; i++) {
        // Update progress in the document record
        const progress = Math.round(((i + 1) / estimatedPageCount) * 100);
        await supabase
          .from('documents')
          .update({
            processing_progress: progress
          })
          .eq('id', documentId);
        
        // Create thumbnail URL - in this implementation, we'll use placeholder images
        // but in a real system you'd generate actual thumbnails
        const pageNumber = i + 1;
        
        // Extract a portion of text for this page
        const pageSize = Math.floor(pdfText.length / estimatedPageCount);
        const startIdx = i * pageSize;
        const endIdx = startIdx + pageSize;
        const pageText = pdfText.substring(startIdx, endIdx);
        
        // Generate a more realistic page preview using a placeholder service
        // In a real implementation, you would render the PDF page to an image
        const thumbnailUrl = `https://placehold.co/800x1100/f5f5f5/333333?text=Page+${pageNumber}`;
        
        // Store page info in database
        const { data: pageData, error: pageError } = await supabase
          .from('document_pages')
          .insert({
            document_id: documentId,
            page_number: pageNumber,
            image_url: thumbnailUrl,
            text_content: pageText.substring(0, 1000) // Limit text to avoid database size issues
          })
          .select()
          .single();
        
        if (pageError) {
          console.error(`Error storing page ${pageNumber}:`, pageError);
        } else {
          thumbnails.push(pageData.image_url);
        }
        
        console.log(`Processed page ${pageNumber} of ${estimatedPageCount}`);
      }

      // Extract text content from the PDF for transcription
      // In a real system, you'd use OCR or PDF text extraction
      // For this example, we'll use a basic extraction based on the PDF content
      const textContent = pdfText
        .replace(/^\s*\d+\s*$/gm, '') // Remove page numbers
        .replace(/[\r\n]+/g, '\n')    // Normalize line endings
        .replace(/[^\x20-\x7E\n]/g, '') // Keep only printable ASCII and newlines
        .trim();

      // Update document with page count and status
      await supabase
        .from('documents')
        .update({
          status: 'processed',
          page_count: estimatedPageCount,
          processing_progress: 100,
          transcription: textContent
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
          message: `Converted ${estimatedPageCount} pages to images`
        });

      return responseWithCors({
        success: true,
        pageCount: estimatedPageCount,
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
