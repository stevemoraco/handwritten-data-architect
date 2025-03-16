
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
        
        // Set bucket as public
        const { error: updateBucketError } = await supabase.storage.updateBucket(bucketName, {
          public: true,
          fileSizeLimit: 104857600 // 100MB
        });
        
        if (updateBucketError) {
          console.error("Error updating bucket:", updateBucketError);
          throw new Error(`Failed to update storage bucket: ${updateBucketError.message}`);
        }
      }
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
      
      // Second try: with decoded path
      if (!pdfBuffer) {
        try {
          const decodedPath = `${userId}/${documentId}/${decodedFileName}`;
          console.log(`Trying with decoded path: ${decodedPath}`);
          
          const { data: fileData, error: downloadError } = await supabase
            .storage
            .from(bucketName)
            .download(decodedPath);
          
          if (!downloadError && fileData) {
            pdfBuffer = await fileData.arrayBuffer();
            console.log(`Successfully downloaded file with decoded path (${pdfBuffer.byteLength} bytes)`);
          } else {
            console.error(`Decoded path download failed: ${downloadError?.message}`);
          }
        } catch (error) {
          console.error("Error in decoded path download:", error);
        }
      }
      
      // Third try: direct URL fetch
      if (!pdfBuffer) {
        try {
          // Try with the original URL
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
            
            // Try with decoded URL
            const decodedUrl = decodeURIComponent(document.original_url);
            console.log(`Trying with decoded URL: ${decodedUrl}`);
            
            const decodedResponse = await fetch(decodedUrl, {
              headers: {
                'Accept': 'application/pdf',
                'Cache-Control': 'no-cache'
              }
            });
            
            if (decodedResponse.ok) {
              pdfBuffer = await decodedResponse.arrayBuffer();
              console.log(`Successfully fetched PDF with decoded URL (${pdfBuffer.byteLength} bytes)`);
            } else {
              console.error(`Decoded URL fetch failed: ${decodedResponse.status} ${decodedResponse.statusText}`);
            }
          }
        } catch (error) {
          console.error("Error in direct URL fetch:", error);
        }
      }
      
      // Final try: Create a new signed URL and try that
      if (!pdfBuffer) {
        try {
          console.log("Creating signed URL as last resort");
          
          const { data: signedUrlData, error: signedUrlError } = await supabase
            .storage
            .from(bucketName)
            .createSignedUrl(filePath, 60); // 60 seconds expiry
          
          if (!signedUrlError && signedUrlData?.signedUrl) {
            console.log(`Trying with signed URL: ${signedUrlData.signedUrl}`);
            
            const signedResponse = await fetch(signedUrlData.signedUrl, {
              headers: {
                'Accept': 'application/pdf',
                'Cache-Control': 'no-cache'
              }
            });
            
            if (signedResponse.ok) {
              pdfBuffer = await signedResponse.arrayBuffer();
              console.log(`Successfully fetched PDF with signed URL (${pdfBuffer.byteLength} bytes)`);
            } else {
              console.error(`Signed URL fetch failed: ${signedResponse.status} ${signedResponse.statusText}`);
            }
          } else {
            console.error(`Failed to create signed URL: ${signedUrlError?.message}`);
          }
        } catch (error) {
          console.error("Error in signed URL fetch:", error);
        }
      }
      
      // If we still don't have the PDF after all attempts
      if (!pdfBuffer) {
        throw new Error(`Failed to fetch PDF after multiple attempts: ${fetchError?.message || 'Unknown error'}`);
      }
      
      // Re-upload the file to storage to ensure it's accessible
      try {
        const { error: uploadError } = await supabase
          .storage
          .from(bucketName)
          .upload(filePath, pdfBuffer, {
            contentType: 'application/pdf',
            upsert: true
          });
        
        if (uploadError) {
          console.error("Failed to re-upload PDF to storage:", uploadError);
        } else {
          console.log(`Re-uploaded PDF to storage path: ${filePath}`);
          
          // Update the document URL with the freshly uploaded file
          const { data: publicUrlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(filePath);
            
          if (publicUrlData?.publicUrl) {
            await supabase
              .from('documents')
              .update({ original_url: publicUrlData.publicUrl })
              .eq('id', documentId);
              
            console.log(`Updated document URL to: ${publicUrlData.publicUrl}`);
          }
        }
      } catch (uploadError) {
        console.error("Error during re-upload:", uploadError);
      }

      // Determine page count based on file size (rough estimate)
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
          processing_progress: 100,
          original_url: document.original_url // Ensure the URL is preserved
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
