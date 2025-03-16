import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Code, Zap, Upload, Database, Search, Settings, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Key, Gauge, AlertTriangle } from "lucide-react";

export default function Documentation() {
  return (
    <div className="container py-8">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Documentation</h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            <div className="bg-card rounded-lg border shadow-sm">
              <div className="p-4">
                <h3 className="font-medium mb-2">Quick Navigation</h3>
                <nav className="space-y-1">
                  <a href="#getting-started" className="block py-1.5 px-2 rounded-md hover:bg-accent text-sm font-medium">Getting Started</a>
                  <a href="#api-reference" className="block py-1.5 px-2 rounded-md hover:bg-accent text-sm font-medium">API Reference</a>
                  <a href="#guides" className="block py-1.5 px-2 rounded-md hover:bg-accent text-sm font-medium">Guides & Tutorials</a>
                  <a href="#sdk" className="block py-1.5 px-2 rounded-md hover:bg-accent text-sm font-medium">SDKs & Libraries</a>
                  <a href="#faq" className="block py-1.5 px-2 rounded-md hover:bg-accent text-sm font-medium">FAQs</a>
                </nav>
              </div>
            </div>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Need Help?</CardTitle>
                <CardDescription>Can't find what you're looking for?</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <a href="/help">
                      <Search className="mr-2 h-4 w-4" />
                      Help Center
                    </a>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <a href="/contact">
                      <User className="mr-2 h-4 w-4" />
                      Contact Support
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        <div className="lg:col-span-3 space-y-10">
          <section id="getting-started">
            <h2 className="text-2xl font-bold mb-6">Getting Started</h2>
            
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/10 w-8 h-8 rounded-full flex items-center justify-center">
                      <span className="font-medium text-primary">1</span>
                    </div>
                    <h3 className="font-semibold text-lg">Create an account</h3>
                  </div>
                  <p>Sign up for Handwriting Digitizer by creating an account with your email address or OAuth provider.</p>
                  <Button size="sm" variant="outline" asChild>
                    <a href="/register">Register Now</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/10 w-8 h-8 rounded-full flex items-center justify-center">
                      <span className="font-medium text-primary">2</span>
                    </div>
                    <h3 className="font-semibold text-lg">Upload your documents</h3>
                  </div>
                  <p>Upload handwritten documents in PDF, JPG, PNG, or TIFF formats. Our system supports both individual files and batch uploads.</p>
                  <Button size="sm" variant="outline" asChild>
                    <a href="/process">Upload Documents</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/10 w-8 h-8 rounded-full flex items-center justify-center">
                      <span className="font-medium text-primary">3</span>
                    </div>
                    <h3 className="font-semibold text-lg">Define your data schema</h3>
                  </div>
                  <p>Define the structure for data extraction by creating a schema or using one of our templates for common document types.</p>
                  <Button size="sm" variant="outline" asChild>
                    <a href="/schemas">Manage Schemas</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/10 w-8 h-8 rounded-full flex items-center justify-center">
                      <span className="font-medium text-primary">4</span>
                    </div>
                    <h3 className="font-semibold text-lg">Process and export</h3>
                  </div>
                  <p>Process your documents and export the extracted data in CSV, JSON, Excel, or directly to your integrated systems.</p>
                  <Button size="sm" variant="outline" asChild>
                    <a href="/documentation/exports">View Export Options</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
          
          <Separator />
          
          <section id="api-reference">
            <h2 className="text-2xl font-bold mb-6">API Reference</h2>
            
            <Tabs defaultValue="rest">
              <TabsList className="mb-6">
                <TabsTrigger value="rest">REST API</TabsTrigger>
                <TabsTrigger value="sdk">SDKs</TabsTrigger>
                <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
              </TabsList>
              
              <TabsContent value="rest">
                <Card>
                  <CardHeader>
                    <CardTitle>REST API Documentation</CardTitle>
                    <CardDescription>
                      Our RESTful API allows you to integrate Handwriting Digitizer into your applications.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4">The API is organized around REST principles. It uses HTTP response codes, authentication with API keys, and returns JSON responses.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <Button variant="outline" className="justify-start" asChild>
                        <a href="/api">
                          <Code className="mr-2 h-4 w-4" />
                          API Reference
                        </a>
                      </Button>
                      <Button variant="outline" className="justify-start" asChild>
                        <a href="/api/authentication">
                          <Key className="mr-2 h-4 w-4" />
                          Authentication
                        </a>
                      </Button>
                      <Button variant="outline" className="justify-start" asChild>
                        <a href="/api/rate-limits">
                          <Gauge className="mr-2 h-4 w-4" />
                          Rate Limits
                        </a>
                      </Button>
                      <Button variant="outline" className="justify-start" asChild>
                        <a href="/api/errors">
                          <AlertTriangle className="mr-2 h-4 w-4" />
                          Error Handling
                        </a>
                      </Button>
                    </div>
                    
                    <h4 className="font-medium mb-2">Key Endpoints</h4>
                    <ul className="space-y-2 ml-6 list-disc">
                      <li><code>/v1/documents</code> - Upload and manage documents</li>
                      <li><code>/v1/schemas</code> - Define and manage data schemas</li>
                      <li><code>/v1/process</code> - Process documents and extract data</li>
                      <li><code>/v1/exports</code> - Export processed data</li>
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="sdk">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <div className="bg-[#3178c6] p-1 rounded">
                          <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
                            <path d="M1.125 0C.502 0 0 .502 0 1.125v21.75C0 23.498.502 24 1.125 24h21.75c.623 0 1.125-.502 1.125-1.125V1.125C24 .502 23.498 0 22.875 0zm17.363 9.75c.612 0 1.154.037 1.627.111a6.38 6.38 0 0 1 1.306.34v2.458a3.95 3.95 0 0 0-.643-.361 5.093 5.093 0 0 0-.717-.26 5.453 5.453 0 0 0-1.426-.2c-.3 0-.573.028-.819.086a2.1 2.1 0 0 0-.623.242c-.17.104-.3.229-.393.374a.888.888 0 0 0-.14.49c0 .196.053.373.156.529.104.156.252.304.443.444s.423.276.696.41c.273.135.582.274.926.416.47.197.892.407 1.266.628.374.222.695.473.963.753.268.279.472.598.614.957.142.359.214.776.214 1.253 0 .657-.125 1.21-.373 1.656a3.033 3.033 0 0 1-1.012 1.085 4.38 4.38 0 0 1-1.487.596c-.566.12-1.163.18-1.79.18a9.916 9.916 0 0 1-1.84-.164 5.544 5.544 0 0 1-1.512-.493v-2.63a5.033 5.033 0 0 0 3.237 1.2c.333 0 .624-.03.872-.09.249-.06.456-.144.623-.25.166-.108.29-.234.373-.38a1.023 1.023 0 0 0-.074-1.089 2.12 2.12 0 0 0-.537-.5 5.597 5.597 0 0 0-.807-.444 27.72 27.72 0 0 0-1.007-.436c-.918-.383-1.602-.852-2.053-1.405-.45-.553-.676-1.222-.676-2.005 0-.614.123-1.141.369-1.582.246-.441.58-.804 1.004-1.089a4.494 4.494 0 0 1 1.47-.629 7.536 7.536 0 0 1 1.77-.201zm-15.113.188h9.563v2.166H9.506v9.646H6.789v-9.646H3.375z"/>
                          </svg>
                        </div>
                        TypeScript/JavaScript SDK
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-4">Integrate with our service using our TypeScript/JavaScript SDK for Node.js and browser environments.</p>
                      <div className="bg-secondary p-3 rounded-md text-sm font-mono mb-4">
                        npm install @handwriting-digitizer/js
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a href="/sdk/javascript">View Documentation</a>
                      </Button>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <div className="bg-[#4B8BBE] p-1 rounded">
                          <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
                            <path d="M14.25.18l.9.2.73.26.59.3.45.32.34.34.25.34.16.33.1.3.04.26.02.2-.01.13V8.5l-.05.63-.13.55-.21.46-.26.38-.3.31-.33.25-.35.19-.35.14-.33.1-.3.07-.26.04-.21.02H8.77l-.69.05-.59.14-.5.22-.41.27-.33.32-.27.35-.2.36-.15.37-.1.35-.07.32-.04.27-.02.21v3.06H3.17l-.21-.03-.28-.07-.32-.12-.35-.18-.36-.26-.36-.36-.35-.46-.32-.59-.28-.73-.21-.88-.14-1.05-.05-1.23.06-1.22.16-1.04.24-.87.32-.71.36-.57.4-.44.42-.33.42-.24.4-.16.36-.1.32-.05.24-.01h.16l.06.01h8.16v-.83H6.18l-.01-2.75-.02-.37.05-.34.11-.31.17-.28.25-.26.31-.23.38-.2.44-.18.51-.15.58-.12.64-.1.71-.06.77-.04.84-.02 1.27.05zm-6.3 1.98l-.23.33-.08.41.08.41.23.34.33.22.41.09.41-.09.33-.22.23-.34.08-.41-.08-.41-.23-.33-.33-.22-.41-.09-.41.09zm13.09 3.95l.28.06.32.12.35.18.36.27.36.35.35.47.32.59.28.73.21.88.14 1.04.05 1.23-.06 1.23-.16 1.04-.24.86-.32.71-.36.57-.4.45-.42.33-.42.24-.4.16-.36.09-.32.05-.24.02-.16-.01h-8.22v.82h5.84l.01 2.76.02.36-.05.34-.11.31-.17.29-.25.25-.31.24-.38.2-.44.17-.51.15-.58.13-.64.09-.71.07-.77.04-.84.01-1.27-.04-1.07-.14-.9-.2-.73-.25-.59-.3-.45-.33-.34-.34-.25-.34-.16-.33-.1-.3-.04-.25-.02-.2.01-.13v-5.34l.05-.64.13-.54.21-.46.26-.38.3-.32.33-.24.35-.2.35-.14.33-.1.3-.06.26-.04.21-.02.13-.01h5.84l.69-.05.59-.14.5-.21.41-.28.33-.32.27-.35.2-.36.15-.36.1-.35.07-.32.04-.28.02-.21V6.07h2.09l.14.01zm-6.47 14.25l-.23.33-.08.41.08.41.23.33.33.23.41.08.41-.08.33-.23.23-.33.08-.41-.08-.41-.23-.33-.33-.23-.41-.08-.41.08z"/>
                          </svg>
                        </div>
                        Python SDK
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-4">Interact with our API from Python applications with our official Python SDK.</p>
                      <div className="bg-secondary p-3 rounded-md text-sm font-mono mb-4">
                        pip install handwriting-digitizer
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a href="/sdk/python">View Documentation</a>
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="webhooks">
                <Card>
                  <CardHeader>
                    <CardTitle>Webhooks</CardTitle>
                    <CardDescription>
                      Get real-time notifications when events happen in your Handwriting Digitizer account.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4">
                      Webhooks allow your application to receive real-time notifications about events in your Handwriting Digitizer account, such as when a document is processed or when data extraction is complete.
                    </p>
                    
                    <h4 className="font-medium mb-2">Available Events</h4>
                    <ul className="space-y-2 ml-6 list-disc mb-4">
                      <li><code>document.uploaded</code> - When a document is successfully uploaded</li>
                      <li><code>document.processed</code> - When document processing is complete</li>
                      <li><code>data.extracted</code> - When data extraction is complete</li>
                      <li><code>export.complete</code> - When data export is complete</li>
                    </ul>
                    
                    <Button variant="outline" size="sm" asChild>
                      <a href="/api/webhooks">Webhook Documentation</a>
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </section>
          
          <Separator />
          
          <section id="guides" className="space-y-6">
            <h2 className="text-2xl font-bold mb-6">Guides & Tutorials</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-primary" />
                    Document Upload Best Practices
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-3">Learn how to prepare and upload documents for optimal recognition accuracy.</p>
                  <Button variant="link" className="px-0" asChild>
                    <a href="/documentation/guides/document-upload">Read Guide</a>
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    Creating Custom Schemas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-3">Learn how to define custom schemas to extract exactly the data you need.</p>
                  <Button variant="link" className="px-0" asChild>
                    <a href="/documentation/guides/custom-schemas">Read Guide</a>
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    Integration Tutorials
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-3">Step-by-step guides to integrate Handwriting Digitizer with popular platforms.</p>
                  <Button variant="link" className="px-0" asChild>
                    <a href="/documentation/guides/integrations">View Tutorials</a>
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-primary" />
                    Advanced Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-3">Fine-tune recognition settings for different document types and languages.</p>
                  <Button variant="link" className="px-0" asChild>
                    <a href="/documentation/guides/advanced-config">Read Guide</a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </section>
          
          <Separator />
          
          <section id="faq">
            <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
            
            <div className="space-y-4">
              <Accordion type="single" collapsible>
                <AccordionItem value="faq-1">
                  <AccordionTrigger>What file formats does Handwriting Digitizer support?</AccordionTrigger>
                  <AccordionContent>
                    Handwriting Digitizer supports PDF, JPEG, PNG, TIFF, and BMP files. For multi-page documents, PDF is the recommended format.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="faq-2">
                  <AccordionTrigger>How accurate is the handwriting recognition?</AccordionTrigger>
                  <AccordionContent>
                    Our recognition accuracy typically ranges from 85% to 95%, depending on the clarity of the handwriting. You can improve accuracy by uploading clear, high-resolution images and using our validation tools.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="faq-3">
                  <AccordionTrigger>Can I process documents in languages other than English?</AccordionTrigger>
                  <AccordionContent>
                    Yes, Handwriting Digitizer supports multiple languages, including Spanish, French, German, Italian, Portuguese, Dutch, and more. You can specify the language when creating a processing job.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="faq-4">
                  <AccordionTrigger>How do I integrate Handwriting Digitizer with my existing systems?</AccordionTrigger>
                  <AccordionContent>
                    You can integrate using our REST API, webhooks, or one of our SDKs. We also offer pre-built integrations with popular platforms like Salesforce, SAP, and Microsoft Dynamics.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="faq-5">
                  <AccordionTrigger>Is my data secure?</AccordionTrigger>
                  <AccordionContent>
                    Yes, we take data security seriously. All data is encrypted in transit and at rest. We are SOC 2 compliant and follow strict data handling procedures. You can learn more on our Security page.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
            
            <div className="mt-6">
              <Button asChild>
                <a href="/help">View All FAQs</a>
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
