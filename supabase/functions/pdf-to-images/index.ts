import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { PDFLoader } from "https://esm.sh/pdf-loader-js@2.3.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { documentId, userId } = await req.json();

  console.log("DETAILED DEBUG: Starting PDF processing", {
    documentId,
    userId,
    fullRequest: JSON.stringify(req, null, 2)
  });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Supabase URL or service role key not found in environment variables.");
    return new Response(
      JSON.stringify({
        success: false,
        error: "Supabase configuration missing",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false
    }
  });

  try {
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError) {
      console.error("Error fetching document:", docError);
      throw new Error(`Failed to fetch document: ${docError.message}`);
    }

    if (!document) {
      console.error("Document not found");
      throw new Error("Document not found");
    }

    console.log("DETAILED DEBUG: Document details", {
      documentId,
      documentName: document.name,
      documentType: document.type,
      documentSize: document.size,
      documentStatus: document.status
    });

    if (document.type !== 'pdf') {
      console.warn("Document is not a PDF, skipping conversion");
      return new Response(
        JSON.stringify({
          success: true,
          message: "Document is not a PDF, skipping conversion",
          pageCount: 0
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: fileData, error: storageError } = await supabase.storage
      .from('document_files')
      .download(`${userId}/${documentId}/${encodeURIComponent(document.name)}`);

    if (storageError) {
      console.error("Error downloading file from storage:", storageError);
      throw new Error(`Failed to download file: ${storageError.message}`);
    }

    if (!fileData) {
      console.error("File data is null");
      throw new Error("File data is null");
    }

    console.log("DETAILED DEBUG: File downloaded from storage", {
      documentId,
      fileSize: fileData.size,
      fileType: fileData.type
    });

    const pdfLoader = new PDFLoader({ data: fileData });
    const pdfDocument = await pdfLoader.load();

    console.log("DETAILED DEBUG: PDF loaded into pdf-loader-js", {
      documentId,
      pageCount: pdfDocument.pages.length
    });

    const pageCount = pdfDocument.pages.length;

    await supabase
      .from('documents')
      .update({ page_count: pageCount, status: 'processing' })
      .eq('id', documentId);

    console.log("DETAILED DEBUG: Updated document with page count", {
      documentId,
      pageCount
    });

    for (let i = 0; i < pageCount; i++) {
      try {
        const page = pdfDocument.pages[i];
        const imageBuffer = await page.getImage();
        const imageName = `page-${i + 1}.png`;
        const imagePath = `${userId}/${documentId}/${imageName}`;
        const mimeType = 'image/png';

        console.log(`DETAILED DEBUG: Processing page ${i + 1}`, {
          documentId,
          pageNumber: i + 1,
          imageSize: imageBuffer.byteLength,
          mimeType
        });

        const { data: uploadResult, error: uploadError } = await supabase.storage
          .from('document_files')
          .upload(imagePath, imageBuffer, {
            contentType: mimeType,
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error(`Error uploading image for page ${i + 1}:`, uploadError);
          throw new Error(`Failed to upload image for page ${i + 1}: ${uploadError.message}`);
        }

        console.log(`DETAILED DEBUG: Image uploaded for page ${i + 1}`, {
          documentId,
          pageNumber: i + 1,
          imagePath: uploadResult
        });

        const { data: publicURL } = supabase.storage
          .from('document_files')
          .getPublicUrl(imagePath);

        console.log(`DETAILED DEBUG: Got public URL for page ${i + 1}`, {
          documentId,
          pageNumber: i + 1,
          publicURL: publicURL.publicUrl
        });

        // Extract text content from the page
        const textContent = page.getTextContent();

        await supabase.from('document_pages').insert({
          document_id: documentId,
          page_number: i + 1,
          image_url: publicURL.publicUrl,
          text_content: textContent
        });

        console.log(`DETAILED DEBUG: Page record created for page ${i + 1}`, {
          documentId,
          pageNumber: i + 1,
          imageUrl: publicURL.publicUrl
        });
      } catch (pageError) {
        console.error(`Error processing page ${i + 1}:`, pageError);
        await supabase.from('documents')
          .update({ status: 'failed', processing_error: `Page ${i + 1} processing failed: ${pageError.message}` })
          .eq('id', documentId);
        throw new Error(`Page ${i + 1} processing failed: ${pageError.message}`);
      }
    }

    await supabase
      .from('documents')
      .update({ status: 'processed' })
      .eq('id', documentId);

    console.log("DETAILED DEBUG: Document processing complete", {
      documentId
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "PDF converted to images successfully",
        pageCount: pageCount
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("CRITICAL PROCESSING ERROR (FULL DETAILS):", {
      error: {
        message: error.message,
        name: error.name,
        stack: error.stack,
        code: error.code,
        details: error.details || "No details available",
        fullError: JSON.stringify(error, null, 2)
      },
      context: {
        documentId,
        userId,
        operation: "pdf-to-images",
        timestamp: new Date().toISOString()
      }
    });
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error occurred",
        errorDetails: {
          name: error.name,
          stack: error.stack,
          code: error.code
        }
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
