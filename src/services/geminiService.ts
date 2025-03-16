
import { GeminiPrompt } from "@/types";

// This is a mock implementation. In a real app, you would call the Gemini API
// with proper rate limiting, retries, etc.
export const processWithGemini = async (prompt: GeminiPrompt): Promise<string> => {
  console.log("Processing with Gemini:", prompt);
  
  // Simulate API call with a delay
  await new Promise((resolve) => setTimeout(resolve, 1500));
  
  // For development, return mock responses based on the prompt content
  if (prompt.prompt.includes("transcribe")) {
    return mockTranscriptionResponse(prompt);
  } else if (prompt.prompt.includes("schema")) {
    return mockSchemaResponse(prompt);
  } else if (prompt.prompt.includes("extract data")) {
    return mockDataExtractionResponse(prompt);
  }
  
  return "I've processed your request. Here's my response...";
};

// Mock response for document transcription
const mockTranscriptionResponse = (prompt: GeminiPrompt): string => {
  return `# Medical Questionnaire

## Patient Information
- **Name**: John Smith
- **Date of Birth**: 05/12/1975
- **Patient ID**: 12345678

## Medical History
- Previous surgeries: None
- Allergies: Penicillin
- Current medications: Lisinopril 10mg daily

## Current Symptoms
- Headache: Yes (3 days)
- Fever: No
- Fatigue: Yes (1 week)
- Shortness of breath: No

## Family History
- Diabetes: Mother
- Heart disease: Father
- Cancer: None

## Lifestyle
- Smoking: No
- Alcohol consumption: Occasional
- Exercise frequency: 2-3 times per week
`;
};

// Mock response for schema generation
const mockSchemaResponse = (prompt: GeminiPrompt): string => {
  return JSON.stringify({
    schema: {
      name: "Medical Questionnaire Schema",
      description: "A comprehensive schema for structured extraction of medical questionnaire data",
      tables: [
        {
          name: "PatientInformation",
          description: "Basic identifiers and demographic details of the patient",
          fields: [
            { name: "FullName", type: "string", required: true },
            { name: "DateOfBirth", type: "date", required: true },
            { name: "PatientID", type: "string", required: true },
            { name: "Gender", type: "enum", enumValues: ["Male", "Female", "Non-binary", "Other"], required: true }
          ]
        },
        {
          name: "MedicalHistory",
          description: "Patient's prior medical conditions and relevant health information",
          fields: [
            { name: "PreviousSurgeries", type: "string", required: false },
            { name: "Allergies", type: "string", required: true },
            { name: "CurrentMedications", type: "string", required: true }
          ]
        },
        {
          name: "CurrentSymptoms",
          description: "Present symptoms as reported by the patient",
          fields: [
            { name: "Headache", type: "string", required: false },
            { name: "Fever", type: "string", required: false },
            { name: "Fatigue", type: "string", required: false },
            { name: "ShortnessOfBreath", type: "string", required: false }
          ]
        },
        {
          name: "FamilyHistory",
          description: "Family medical history relevant to patient care",
          fields: [
            { name: "Diabetes", type: "string", required: false },
            { name: "HeartDisease", type: "string", required: false },
            { name: "Cancer", type: "string", required: false }
          ]
        },
        {
          name: "Lifestyle",
          description: "Patient lifestyle factors affecting health",
          fields: [
            { name: "Smoking", type: "string", required: true },
            { name: "AlcoholConsumption", type: "string", required: true },
            { name: "ExerciseFrequency", type: "string", required: true }
          ]
        }
      ],
      rationale: "This schema is structured to capture all the common fields in medical questionnaires while accommodating variations in question format and handwritten answers. The tables are organized by logical groupings of information to maintain clarity and facilitate data extraction.",
      suggestions: [
        { 
          description: "Add a 'Consent' table to capture patient consent information", 
          type: "add", 
          impact: "Better compliance with healthcare regulations" 
        },
        { 
          description: "Expand 'Current Symptoms' to include pain scale ratings", 
          type: "modify", 
          impact: "More consistent quantification of subjective symptoms" 
        },
        { 
          description: "Add vaccination history to Medical History section", 
          type: "add", 
          impact: "Important for comprehensive preventive care assessment" 
        }
      ]
    }
  }, null, 2);
};

// Mock response for data extraction
const mockDataExtractionResponse = (prompt: GeminiPrompt): string => {
  return JSON.stringify({
    extractedData: {
      "PatientInformation": {
        "FullName": "John Smith",
        "DateOfBirth": "1975-05-12",
        "PatientID": "12345678",
        "Gender": "Male"
      },
      "MedicalHistory": {
        "PreviousSurgeries": "None",
        "Allergies": "Penicillin",
        "CurrentMedications": "Lisinopril 10mg daily"
      },
      "CurrentSymptoms": {
        "Headache": "Yes (3 days)",
        "Fever": "No",
        "Fatigue": "Yes (1 week)",
        "ShortnessOfBreath": "No"
      },
      "FamilyHistory": {
        "Diabetes": "Mother",
        "HeartDisease": "Father",
        "Cancer": "None"
      },
      "Lifestyle": {
        "Smoking": "No",
        "AlcoholConsumption": "Occasional",
        "ExerciseFrequency": "2-3 times per week"
      }
    },
    confidence: 0.89,
    processingTime: "1.2 seconds"
  }, null, 2);
};

export const buildTranscriptionPrompt = (document: any): GeminiPrompt => {
  return {
    documentId: document.id,
    prompt: `Please carefully examine the provided document images. This is a handwritten document that contains important information. 
    
Transcribe ALL the text content from these images into a clear, well-formatted markdown document. 
    
Important instructions:
1. Maintain the original structure of the document as much as possible.
2. Use headers (## and ###) to represent section titles and subtitles.
3. Use lists (- or numbered) for items that appear in list format.
4. Preserve the relationships between questions and answers.
5. If handwriting is unclear, indicate with [illegible] but make your best guess if possible.
6. Include ALL text content, including headers, footers, and any notes.

The output should be a complete, accurate transcription that could be used as a text-only reference for the original document.`,
    includeImages: true,
    includeTranscription: false
  };
};

export const buildSchemaGenerationPrompt = (documents: any[]): GeminiPrompt => {
  return {
    prompt: `Analyze the provided transcriptions of handwritten medical questionnaires. I need you to design a data schema that can efficiently capture ALL information from these documents. 

Create a structured schema with tables and fields that would work for extracting data from these and similar questionnaires.

Important requirements:
1. Each logical section of the questionnaire should be a separate table.
2. Fields should capture specific data points with appropriate types (string, number, boolean, date, enum).
3. Mark fields as required when they are critical for the document's purpose.
4. Include a rationale explaining your design decisions.
5. Suggest 3-5 potential improvements to make the schema more robust.

Return your response as a JSON object with this structure:
{
  "schema": {
    "name": "Schema name",
    "description": "Brief description",
    "tables": [
      {
        "name": "TableName",
        "description": "Table purpose",
        "fields": [
          { 
            "name": "FieldName", 
            "type": "string|number|boolean|date|enum", 
            "required": true|false,
            "enumValues": ["value1", "value2"] // Only for enum types
          }
        ]
      }
    ],
    "rationale": "Detailed explanation of schema design choices",
    "suggestions": [
      {
        "description": "Suggestion description",
        "type": "add|modify|remove",
        "impact": "Explanation of the benefit"
      }
    ]
  }
}`,
    includeTranscription: true
  };
};

export const buildDataExtractionPrompt = (document: any, schema: any): GeminiPrompt => {
  return {
    documentId: document.id,
    prompt: `Extract structured data from the provided document images according to the following schema. The document is a handwritten medical questionnaire. 

Schema structure:
${JSON.stringify(schema, null, 2)}

Instructions:
1. Extract all relevant data from the document that matches the schema.
2. For each field in each table, provide the corresponding value from the document.
3. If a piece of information is not present in the document, use null.
4. If handwriting is unclear, make your best guess and indicate confidence level.
5. Return data in a structured JSON format matching the schema tables and fields.

Return your response as a JSON object with this structure:
{
  "extractedData": {
    "TableName1": {
      "FieldName1": "extracted value",
      "FieldName2": "extracted value"
    },
    "TableName2": {
      "FieldName1": "extracted value",
      "FieldName2": "extracted value"
    }
  },
  "confidence": 0.95, // Overall confidence in extraction accuracy (0-1)
  "processingTime": "X seconds"
}`,
    includeImages: true,
    includeTranscription: false
  };
};
