
import { supabase } from "@/integrations/supabase/client";
import { DocumentPrompt } from "@/types";

interface GeminiConfig {
  model: string;
  temperature: number;
  maxOutputTokens: number;
  topP: number;
  topK: number;
}

export const getDefaultGeminiConfig = (): GeminiConfig => ({
  model: "gemini-2.0-flash-lite",
  temperature: 0.4,
  maxOutputTokens: 2048,
  topP: 0.8,
  topK: 40,
});

/**
 * Saves a prompt to the document_prompts table
 */
export const savePromptForDocument = async (
  documentId: string,
  promptType: string,
  promptText: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from("document_prompts")
      .insert({
        document_id: documentId,
        prompt_type: promptType,
        prompt_text: promptText
      });

    if (error) {
      console.error("Error saving prompt:", error);
    }
  } catch (error) {
    console.error("Failed to save prompt:", error);
  }
};

/**
 * Retrieves prompts for a specific document
 */
export const getPromptsForDocument = async (documentId: string): Promise<DocumentPrompt[]> => {
  try {
    const { data, error } = await supabase
      .from("document_prompts")
      .select("*")
      .eq("document_id", documentId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching prompts:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Failed to fetch prompts:", error);
    return [];
  }
};

/**
 * Handles the document transcription using Gemini
 */
export const transcribeDocumentWithGemini = async (
  documentId: string,
  pageUrls: string[]
): Promise<string> => {
  try {
    // Invoke the process-document edge function
    const { data, error } = await supabase.functions.invoke("process-document", {
      body: {
        documentId,
        pageUrls,
      },
    });

    if (error) {
      console.error("Error invoking process-document function:", error);
      throw new Error(`Failed to transcribe document: ${error.message || "Unknown error"}`);
    }

    // Check if the function returned an error
    if (!data || !data.success) {
      const errorMessage = data?.error || "Unknown error in document processing";
      console.error("Document processing returned error:", errorMessage);
      throw new Error(errorMessage);
    }

    // Return the transcription
    return data.transcription || "";
  } catch (error) {
    console.error("Error in transcribeDocumentWithGemini:", error);
    throw error;
  }
};

export default { 
  getDefaultGeminiConfig,
  savePromptForDocument,
  getPromptsForDocument,
  transcribeDocumentWithGemini
};
