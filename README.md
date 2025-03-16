# Handwritten Data Architect

## Project Overview

**URL**: [https://lovable.dev/projects/dc163307-7fa8-473d-b09b-444fe810cabd](https://lovable.dev/projects/dc163307-7fa8-473d-b09b-444fe810cabd)

Handwritten Data Architect is a web application designed to transform handwritten documents, particularly medical and legal forms, into structured digital data.  It leverages AI (specifically, a placeholder for Google's Gemini API) to perform Optical Character Recognition (OCR), text transcription, schema generation, and data extraction. The project is built with a modern web development stack, focusing on security, scalability, and user experience.  It's designed to be easily extensible and maintainable, with a clear separation of concerns between the frontend, backend (Supabase functions), and AI processing.

This README provides a comprehensive guide to understanding, setting up, developing, and deploying the Handwritten Data Architect application.

## Key Features

*   **Document Upload and Management:** Users can upload PDF and image files (JPG, PNG, GIF) of handwritten documents.  The system tracks document metadata (name, type, size, upload date, processing status, etc.) and provides a user interface for managing uploaded documents.
*   **PDF to Image Conversion:**  A Supabase Edge Function (`pdf-to-images`) is provided (currently mocked) to convert PDF documents into a series of images, one per page. This is a crucial pre-processing step for OCR.
*   **OCR and Text Transcription:**  The application uses a placeholder for the Gemini API to perform OCR on document images and extract the handwritten text.  The extracted text is stored as a transcription associated with the document.
*   **AI-Powered Schema Generation:**  The system uses a placeholder for the Gemini API to analyze the transcribed text and automatically generate a data schema.  This schema defines the structure of the data to be extracted, including tables, fields, data types, and relationships.  The schema generation process also includes a rationale and suggestions for improvement.
*   **Schema Refinement (Interactive):**  Users can interact with the generated schema through a chat interface (using a mock AI response for now).  They can provide feedback, request changes, and ask for explanations of the schema design.
*   **Data Extraction:**  Once a schema is approved, the system (using a placeholder for the Gemini API) extracts structured data from the document according to the defined schema.
*   **Data Visualization and Export:**  Extracted data is presented in a tabular format, allowing users to view and verify the results.  Users can export the extracted data as CSV.
*   **User Authentication and Authorization:**  Supabase Auth is integrated to provide secure user accounts, login, registration, password reset, and session management.  This ensures that user data and documents are protected.
*   **Processing Logs:**  Detailed logs are maintained for each document processing step, providing transparency and allowing for debugging and auditing.
*   **Progress Tracking:**  The application provides visual progress indicators for document uploads, processing steps, and schema generation.
*   **Responsive Design:**  The user interface is built with Tailwind CSS and is responsive, adapting to different screen sizes (desktop, tablet, mobile).
*   **Error Handling:**  The application includes error handling for various scenarios, such as failed uploads, processing errors, and API failures.  User-friendly error messages are displayed using toasts.
*   **Extensible Architecture:**  The project is structured to allow for easy addition of new features, such as support for additional document types, integration with other AI models, and more sophisticated data validation.

## Technologies Used

*   **Frontend:**
    *   **Vite:**  A fast build tool and development server.
    *   **React:**  A JavaScript library for building user interfaces.
    *   **TypeScript:**  A superset of JavaScript that adds static typing.
    *   **shadcn-ui:**  A collection of reusable React components built with Tailwind CSS and Radix UI.
    *   **Tailwind CSS:**  A utility-first CSS framework for rapidly building custom designs.
    *   **React Router:**  A library for handling navigation and routing in the application.
    *   **TanStack Query (React Query):**  A library for fetching, caching, and updating data.
    *   **Zustand (via use-toast hook):** A small, fast, and scalable state-management solution (used for toast notifications).
    *   **Embla Carousel React:**  A lightweight, framework-agnostic carousel library.
    *   **Input OTP:** A component for entering one-time passwords.
    *   **React Day Picker:** A date picker component.
    *   **React Dropzone:** A library for handling file drag-and-drop.
    *   **Recharts:** A composable charting library built on React components.
    *   **uuid:** A library for generating UUIDs.
    *   **class-variance-authority:** A utility for creating type-safe component variants.
    *   **clsx:** A utility for constructing className strings conditionally.
    *   **tailwind-merge:** A utility for merging Tailwind CSS classes.
    *   **Lucide React:** A library of SVG icons.

*   **Backend:**
    *   **Supabase:**  A Backend-as-a-Service (BaaS) platform that provides a PostgreSQL database, authentication, real-time subscriptions, and edge functions.
        *   **Supabase Auth:**  Handles user authentication and authorization.
        *   **Supabase Storage:**  Used to store uploaded documents and generated images.
        *   **Supabase Database:**  A PostgreSQL database used to store document metadata, processing logs, schemas, and extracted data.
        *   **Supabase Edge Functions:**  Serverless functions that run close to the user, used for PDF processing and (in a real implementation) calling the Gemini API.

*   **AI (Placeholder):**
    *   **Google Gemini API (Mocked):**  The project includes placeholder functions (`src/services/geminiService.ts`) that simulate calls to the Gemini API for OCR, transcription, schema generation, and data extraction.  In a production environment, these would be replaced with actual API calls.

*   **Other:**
    *   **ESLint:**  A linter for JavaScript and TypeScript code.
    *   **Prettier:**  A code formatter.
    *   **PostCSS:**  A tool for transforming CSS with JavaScript.
    *   **Autoprefixer:**  A PostCSS plugin that adds vendor prefixes to CSS rules.

## Project Structure

The project follows a standard React application structure, with additional directories for Supabase integration and specific components:

workspace/
├── .cache # Vite's cache directory
├── .git # Git repository
├── README.md # This file
├── eslint.config.js # ESLint configuration
├── index.html # Main HTML file
├── postcss.config.js # PostCSS configuration
├── public # Static assets
├── src # Source code
| ├── App.css # Global CSS styles
| ├── App.tsx # Main application component
| ├── components # Reusable UI components
| | ├── auth # Authentication-related components (AuthForm, LoginModal)
| | ├── dashboard # Dashboard component
| | ├── document # Document-related components (DocumentCard, DocumentDetail, DocumentUpload, ProcessingSteps)
| | ├── layout # Layout component (AppLayout)
| | ├── schema # Schema-related components (SchemaChat, SchemaDataView, SchemaDetail)
| | └── ui # shadcn-ui components (re-exported for convenience)
| ├── context # React Context providers (AuthContext, DocumentContext, UploadContext)
| ├── hooks # Custom React hooks (use-mobile, use-toast)
| ├── index.css # Global CSS styles (Tailwind directives)
| ├── integrations # Integrations with external services
| | └── supabase # Supabase client and type definitions
| | ├── client.ts # Supabase client initialization
| | └── types.ts # TypeScript types for Supabase database schema
| ├── lib # Utility functions (utils.ts)
| ├── main.tsx # Entry point for the React application
| ├── pages # Page components (Contact, DocumentProcess, Features, Index, NotFound, Pricing, Privacy, Terms)
| ├── services # Functions for interacting with external services (documentService, geminiService)
| ├── types # TypeScript type definitions
| | └── index.ts # Global type definitions
| └── vite-env.d.ts # TypeScript definitions for Vite
├── supabase # Supabase-related files
| └── functions # Supabase Edge Functions
| ├── pdf-to-images # Function to convert PDF to images (currently mocked)
| | └── index.ts
| └── process-document # Function to process documents (OCR, schema generation, data extraction - currently mocked)
| └── index.ts
├── tailwind.config.ts # Tailwind CSS configuration
└── vite.config.ts # Vite configuration

## Setup and Installation

1.  **Prerequisites:**
    *   Node.js (v18 or later recommended) and npm (or yarn/pnpm) installed.
    *   A Supabase account and project.  You'll need the Supabase URL and Anon Key (and Service Role Key for Edge Functions).
    *   (For full functionality) A Google Gemini API key.

2.  **Clone the Repository:**

    ```bash
    git clone <YOUR_GIT_URL>
    cd <YOUR_PROJECT_NAME>
    ```

3.  **Install Dependencies:**

    ```bash
    npm install
    # or
    yarn
    # or
    pnpm install
    ```

4.  **Configure Environment Variables:**

    *   Create a `.env` file in the root directory of the project.
    *   Add the following environment variables, replacing the placeholders with your actual values:

        ```
        VITE_SUPABASE_URL=<YOUR_SUPABASE_URL>
        VITE_SUPABASE_ANON_KEY=<YOUR_SUPABASE_ANON_KEY>
        VITE_GEMINI_API_KEY=<YOUR_GEMINI_API_KEY>  (Optional for now, as Gemini is mocked)
        ```
        *   **Important:**  The `VITE_` prefix is required for Vite to expose these variables to the client-side code.

5.  **Configure Supabase:**

    *   **Database Schema:**  You'll need to create the necessary tables in your Supabase project's database.  The schema is defined in `src/integrations/supabase/types.ts`.  You can use the Supabase dashboard or SQL scripts to create the tables.  The provided `types.ts` file is generated from a Supabase schema, so it's a good starting point.  You can use the Supabase CLI to generate this file from your own schema.
    *   **Storage:**  Create a bucket named `document_files` in your Supabase Storage.  This bucket will be used to store uploaded documents and generated images.
    *   **Edge Functions:**
        *   Deploy the `supabase/functions/pdf-to-images` and `supabase/functions/process-document` functions to your Supabase project.  You can use the Supabase CLI for this:
            ```bash
            supabase functions deploy pdf-to-images
            supabase functions deploy process-document
            ```
        *   **Important:**  The Edge Functions currently use `Deno.env.get()` to access environment variables.  You'll need to set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `GEMINI_API_KEY` as secrets for your Supabase project using the Supabase CLI or dashboard.  The `SUPABASE_SERVICE_ROLE_KEY` is required for the Edge Functions to have sufficient permissions to modify the database.

6.  **Run the Development Server:**

    ```bash
    npm run dev
    # or
    yarn dev
    # or
    pnpm dev
    ```

    This will start the Vite development server, typically on `http://localhost:8080`.  The application will automatically reload when you make changes to the code.

## Development

### Frontend Development

*   **Components:**  The `src/components` directory contains reusable UI components.  Most of these are from `shadcn-ui`, but there are also custom components for specific features (e.g., `DocumentUpload`, `ProcessingSteps`).
*   **Context:**  React Context is used for managing global state (authentication, document data, upload progress).  The context providers are located in `src/context`.
*   **Hooks:**  Custom hooks are located in `src/hooks`.  `use-mobile` provides a simple way to detect mobile devices, and `use-toast` provides a convenient API for displaying toast notifications.
*   **Pages:**  The `src/pages` directory contains the main page components of the application.
*   **Services:**  The `src/services` directory contains functions for interacting with external services (Supabase and the mocked Gemini API).
*   **Types:**  TypeScript types are defined in `src/types`.

### Backend Development (Supabase)

*   **Database:**  The database schema is defined in `src/integrations/supabase/types.ts`.  You can use the Supabase dashboard or SQL scripts to manage your database schema.
*   **Edge Functions:**  The Edge Functions are located in `supabase/functions`.  These functions are written in TypeScript and run on Deno.  They handle tasks such as PDF processing and interacting with the Gemini API.
    *   **`pdf-to-images`:**  (Currently mocked) Converts a PDF document into a series of images.
    *   **`process-document`:**  (Currently mocked) Orchestrates the document processing workflow, including OCR, schema generation, and data extraction.

### AI Integration (Gemini API)

*   The `src/services/geminiService.ts` file contains placeholder functions for interacting with the Gemini API.  To integrate with the actual Gemini API, you would need to:
    *   Obtain a Gemini API key.
    *   Replace the mock functions with actual API calls.
    *   Implement proper error handling, rate limiting, and retries.
    *   Consider using a library or SDK for interacting with the Gemini API.

### Testing

The project does not currently include any tests.  Adding unit tests (e.g., with Jest and React Testing Library) and integration tests (e.g., with Playwright or Cypress) is highly recommended.

## Deployment

### Deployment with Lovable

The easiest way to deploy the application is to use Lovable:

1.  Open the [Lovable Project](https://lovable.dev/projects/dc163307-7fa8-473d-b09b-444fe810cabd).
2.  Click on "Share" -> "Publish".

### Deployment with Netlify (or similar platforms)

1.  **Build the application:**

    ```bash
    npm run build
    # or
    yarn build
    # or
    pnpm build
    ```

    This will create a `dist` directory containing the production-ready build of your application.

2.  **Deploy to Netlify:**

    *   Create a new site on Netlify.
    *   Connect your Git repository to Netlify.
    *   Configure the build settings:
        *   **Build command:** `npm run build` (or `yarn build` or `pnpm build`)
        *   **Publish directory:** `dist`
    *   Set the environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and optionally `VITE_GEMINI_API_KEY`) in the Netlify site settings.
    *   Deploy the site.

    Netlify will automatically build and deploy your application whenever you push changes to your Git repository.  You can also manually trigger deployments.

### Deployment with Vercel (or similar platforms)

The process for deploying to Vercel is very similar to Netlify.  You'll need to:

1.  Create a new project on Vercel.
2.  Connect your Git repository.
3.  Set the environment variables.
4.  Configure the build settings (Vercel usually auto-detects the correct settings for Vite projects).
5.  Deploy.

### Deployment with Docker

You can also containerize the application using Docker.  This allows for consistent deployments across different environments.  You'll need to create a `Dockerfile` and a `docker-compose.yml` file (optional, but recommended for local development).  A basic `Dockerfile` might look like this:

```dockerfile
# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory to /app
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install app dependencies
RUN npm install

# Bundle app source
COPY . .

# Build the app
RUN npm run build

# Expose port 8080 (or whatever port your app uses)
EXPOSE 8080

# Run the app
CMD [ "npm", "run", "preview" ]
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
IGNORE_WHEN_COPYING_END

You can then build and run the Docker image:

docker build -t handwritten-data-architect .
docker run -p 8080:8080 handwritten-data-architect
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
Bash
IGNORE_WHEN_COPYING_END
Custom Domains
```


# Contributing

Contributions are welcome! Please follow these guidelines:

Fork the repository.

Create a new branch for your feature or bug fix.

Make your changes and commit them with clear, descriptive messages.

Write tests for your changes.

Submit a pull request.

# Security Considerations

Authentication: Supabase Auth provides a secure foundation for user authentication. Ensure that you follow best practices for password management and session handling.

Authorization: Implement proper authorization checks to ensure that users can only access the data and resources they are permitted to. This is particularly important for the document upload and processing features. Supabase Row Level Security (RLS) is crucial for this.

Data Encryption: Supabase Storage encrypts data at rest. Ensure that data in transit is also encrypted using HTTPS.

API Keys: Protect your Supabase API keys and Gemini API key. Store them securely as environment variables and never commit them to your code repository.

Input Validation: Validate all user input to prevent injection attacks and other vulnerabilities.

Rate Limiting: Implement rate limiting to prevent abuse of your API and services. This is especially important for the Gemini API calls.

Regular Security Audits: Conduct regular security audits to identify and address potential vulnerabilities.

CORS: The CORS headers are correctly set up in the Supabase Edge Functions. Make sure to configure these appropriately for your deployment environment.

# Future Enhancements

Full Gemini API Integration: Replace the mock Gemini API calls with actual API calls.

Improved Error Handling: Implement more robust error handling and reporting, including logging errors to a central location.

User Roles and Permissions: Implement different user roles (e.g., admin, editor, viewer) with different levels of access.

Document Versioning: Allow users to track changes to documents and schemas over time.

Collaboration Features: Allow multiple users to collaborate on document processing and schema refinement.

Support for Additional Document Types: Extend the application to support other document types, such as spreadsheets or presentations.

Advanced Search: Implement advanced search capabilities to allow users to easily find documents and data.

Data Validation: Add data validation rules to ensure the accuracy and consistency of extracted data.

Reporting and Analytics: Provide dashboards and reports to track document processing metrics and user activity.

Integrations: Integrate with other applications and services, such as CRM systems or data warehouses.

Testing: Add comprehensive unit and integration tests.

Internationalization (i18n): Add support for multiple languages.

Accessibility (a11y): Ensure the application is accessible to users with disabilities.

This detailed README provides a comprehensive overview of the Handwritten Data Architect project, covering its features, technologies, setup, development, deployment, and security considerations. It should serve as a valuable resource for anyone looking to understand, contribute to, or deploy the application.
