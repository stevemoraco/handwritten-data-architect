
import { Document, SchemaTable } from '@/types';

export const generateGeminiTranscriptionPrompt = (imageUrls: string[]): string => {
  return `
You are an expert assistant helping to digitize handwritten medical questionnaires. 
I've provided images of a handwritten document. Please carefully analyze these images and provide a complete transcription of all visible content.

Guidelines:
1. Maintain the document's structure (sections, tables, bullet points)
2. Transcribe ALL text visible in the images
3. If handwriting is unclear, indicate with [unclear: best guess]
4. Convert the content into properly formatted markdown
5. Include section headers, question numbers, and maintain the hierarchical structure
6. Be particularly careful with names, dates, numerical values, and medical terminology
7. Transcribe checkboxes as [x] for checked and [ ] for unchecked

Please process the complete document page by page, maintaining all visible information.
`;
};

export const generateSchemaPrompt = (documentTranscriptions: string[]): string => {
  return `
You are an expert data architect helping to design a database schema for digitizing handwritten medical questionnaires.

I've provided transcriptions from multiple handwritten medical questionnaires. Please analyze these documents and suggest an optimal database schema design that will:

1. Capture ALL information present across the documents
2. Accommodate variations in how the forms might be filled out
3. Use a well-normalized structure with appropriate relationships
4. Group related fields into logical tables
5. Ensure compatibility with standard healthcare data models where appropriate

Guidelines:
- Propose tables with clear names and descriptions
- For each table, define all necessary fields with appropriate data types
- Identify required vs optional fields
- For enumerated types, suggest possible values
- Consider scalability and flexibility for future additions
- Maintain data integrity across the schema

After presenting the schema, please provide:
1. A brief explanation of your design rationale
2. 5-10 specific suggestions for potential improvements or considerations
3. Any anticipated challenges when parsing the handwritten data into this schema

Output the schema in a structured, organized format suitable for database implementation.
`;
};

export const generateDataExtractionPrompt = (imageUrls: string[], schema: SchemaTable[]): string => {
  const schemaDescription = schema.map(table => {
    const fieldsDescription = table.fields.map(field => 
      `- ${field.name} (${field.type}${field.required ? ', required' : ''})${field.description ? ': ' + field.description : ''}`
    ).join('\n');
    
    return `## ${table.name}
${table.description}

Fields:
${fieldsDescription}`;
  }).join('\n\n');

  return `
You are an expert AI assistant analyzing images of handwritten medical questionnaires.

Your task is to extract information from these documents according to the following database schema:

${schemaDescription}

Guidelines:
1. Extract all relevant information visible in the images
2. Format your response as structured data that matches the schema above
3. For each table, provide values for all fields where information is available
4. If information is unclear or missing, indicate with [unclear] or [missing]
5. Be particularly careful with patient names, dates, numerical values, and medical terminology
6. For checkbox items, indicate whether they are checked or unchecked
7. Maintain the relationship between data items according to the schema

Please process the document and extract all relevant information according to the schema above.
`;
};

export const extractTableData = (apiResponse: string): any => {
  // In a real implementation, this would parse the API response and extract structured data
  // For the mock implementation, we'll return a sample dataset
  return {
    "Patient Information": {
      "Full Name": "John Smith",
      "Date of Birth": "1975-05-12",
      "Patient ID": "12345678",
      "Gender": "Male"
    },
    "Medical History": {
      "Previous Surgeries": "None",
      "Allergies": "Penicillin",
      "Current Medications": "Lisinopril 10mg daily"
    },
    "Current Symptoms": {
      "Headache": "Yes (3 days)",
      "Fever": "No",
      "Fatigue": "Yes (1 week)",
      "Shortness of Breath": "No"
    },
    "Family History": {
      "Diabetes": "Mother",
      "Heart Disease": "Father",
      "Cancer": "None"
    },
    "Lifestyle": {
      "Smoking": "No",
      "Alcohol Consumption": "Occasional",
      "Exercise Frequency": "2-3 times per week"
    }
  };
};

export const simulateFileUpload = async (
  file: File,
  onProgress: (progress: number) => void
): Promise<string> => {
  // Simulate file upload with progress
  return new Promise((resolve) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress > 100) progress = 100;
      
      onProgress(Math.floor(progress));
      
      if (progress === 100) {
        clearInterval(interval);
        // Return a mock URL for the uploaded file
        resolve(URL.createObjectURL(file));
      }
    }, 500);
  });
};
