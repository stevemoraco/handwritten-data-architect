
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentIds } = await req.json();
    
    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No document IDs provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Fetch document details
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('id, name, type, transcription')
      .in('id', documentIds);
    
    if (docsError) {
      console.error("Error fetching documents:", docsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch documents' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!documents || documents.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No documents found with the provided IDs' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get document names
    const documentNames = documents.map(doc => doc.name).join(", ");
    
    // Use Gemini API to generate pipeline name and description
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const modelName = "gemini-1.5-flash";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    
    const prompt = `
      Based on these document names: ${documentNames}
      
      Generate a concise, professional name and brief description for a document processing pipeline that would handle these types of documents.
      The name should be 2-5 words, and the description should be 1-2 sentences explaining the purpose.
      
      Return only a JSON object with this structure:
      {
        "name": "Pipeline Name",
        "description": "Brief description of the pipeline purpose."
      }
    `;

    const geminiResponse = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 }
      })
    });

    if (!geminiResponse.ok) {
      console.error("Gemini API error:", await geminiResponse.text());
      return new Response(
        JSON.stringify({ error: 'Failed to generate pipeline metadata' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiData = await geminiResponse.json();
    const generatedText = geminiData.candidates[0].content.parts[0].text;
    
    // Extract JSON from the response
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    let metadata;
    
    if (jsonMatch) {
      try {
        metadata = JSON.parse(jsonMatch[0]);
      } catch (e) {
        // Fallback if parsing fails
        metadata = {
          name: `Document Pipeline ${new Date().toISOString().slice(0,10)}`,
          description: `Processing pipeline for ${documentNames}`
        };
      }
    } else {
      metadata = {
        name: `Document Pipeline ${new Date().toISOString().slice(0,10)}`,
        description: `Processing pipeline for ${documentNames}`
      };
    }

    // Create pipeline record
    const { data: pipeline, error: pipelineError } = await supabase
      .from('document_pipelines')
      .insert({
        name: metadata.name,
        description: metadata.description,
        document_count: documentIds.length,
        status: 'active'
      })
      .select()
      .single();

    if (pipelineError) {
      console.error("Error creating pipeline:", pipelineError);
      return new Response(
        JSON.stringify({ error: 'Failed to create pipeline' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Associate documents with pipeline
    const pipelineDocuments = documentIds.map(docId => ({
      pipeline_id: pipeline.id,
      document_id: docId
    }));

    const { error: pipelineDocsError } = await supabase
      .from('pipeline_documents')
      .insert(pipelineDocuments);

    if (pipelineDocsError) {
      console.error("Error linking documents to pipeline:", pipelineDocsError);
      // Continue even if linking fails
    }

    // Update document's pipeline_id
    for (const docId of documentIds) {
      await supabase
        .from('documents')
        .update({ pipeline_id: pipeline.id })
        .eq('id', docId);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        pipeline: pipeline 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in pipeline-metadata function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
