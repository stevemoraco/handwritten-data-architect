
import * as React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, Key, Shield, RefreshCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function API() {
  return (
    <AppLayout>
      <div className="container py-8 max-w-5xl">
        <div className="flex items-center gap-3 mb-6">
          <Code className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">API Reference</h1>
        </div>
        
        <p className="text-lg mb-8">
          Integrate Handwriting Digitizer directly into your applications with our comprehensive API. Our RESTful API 
          provides programmatic access to all of our handwriting recognition and data extraction capabilities.
        </p>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              <div className="bg-card rounded-lg border shadow-sm p-4">
                <h3 className="font-medium mb-3">API Sections</h3>
                <nav className="space-y-1">
                  <a href="#authentication" className="block py-1.5 px-2 rounded-md hover:bg-accent text-sm font-medium">Authentication</a>
                  <a href="#rate-limits" className="block py-1.5 px-2 rounded-md hover:bg-accent text-sm font-medium">Rate Limits</a>
                  <a href="#endpoints" className="block py-1.5 px-2 rounded-md hover:bg-accent text-sm font-medium">Endpoints</a>
                  <a href="#errors" className="block py-1.5 px-2 rounded-md hover:bg-accent text-sm font-medium">Error Handling</a>
                  <a href="#versions" className="block py-1.5 px-2 rounded-md hover:bg-accent text-sm font-medium">API Versions</a>
                  <a href="#webhooks" className="block py-1.5 px-2 rounded-md hover:bg-accent text-sm font-medium">Webhooks</a>
                </nav>
              </div>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>API Keys</CardTitle>
                  <CardDescription>Manage your API credentials</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" asChild>
                    <a href="/dashboard/api-keys">Manage API Keys</a>
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>SDKs</CardTitle>
                  <CardDescription>Official client libraries</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                    <a href="/sdk/javascript">
                      <svg viewBox="0 0 24 24" width="16" height="16" className="mr-2" fill="currentColor">
                        <path d="M0 0h24v24H0V0zm22.034 18.276c-.175-1.095-.888-2.015-3.003-2.873-.736-.345-1.554-.585-1.797-1.14-.091-.33-.105-.51-.046-.705.15-.646.915-.84 1.515-.66.39.12.75.42.976.9 1.034-.676 1.034-.676 1.755-1.125-.27-.42-.404-.601-.586-.78-.63-.705-1.469-1.065-2.834-1.034l-.705.089c-.676.165-1.32.525-1.71 1.005-1.14 1.291-.811 3.541.569 4.471 1.365 1.02 3.361 1.244 3.616 2.205.24 1.17-.87 1.545-1.966 1.41-.811-.18-1.26-.586-1.755-1.336l-1.83 1.051c.21.48.45.689.81 1.109 1.74 1.756 6.09 1.666 6.871-1.004.029-.09.24-.705.074-1.65l.046.067zm-8.983-7.245h-2.248c0 1.938-.009 3.864-.009 5.805 0 1.232.063 2.363-.138 2.711-.33.689-1.18.601-1.566.48-.396-.196-.597-.466-.83-.855-.063-.105-.11-.196-.127-.196l-1.825 1.125c.305.63.75 1.172 1.324 1.517.855.51 2.004.675 3.207.405.783-.226 1.458-.691 1.811-1.411.51-.93.402-2.07.397-3.346.012-2.054 0-4.109 0-6.179l.004-.056z"/>
                      </svg>
                      JavaScript SDK
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                    <a href="/sdk/python">
                      <svg viewBox="0 0 24 24" width="16" height="16" className="mr-2" fill="currentColor">
                        <path d="M14.25.18l.9.2.73.26.59.3.45.32.34.34.25.34.16.33.1.3.04.26.02.2-.01.13V8.5l-.05.63-.13.55-.21.46-.26.38-.3.31-.33.25-.35.19-.35.14-.33.1-.3.07-.26.04-.21.02H8.77l-.69.05-.59.14-.5.22-.41.27-.33.32-.27.35-.2.36-.15.37-.1.35-.07.32-.04.27-.02.21v3.06H3.17l-.21-.03-.28-.07-.32-.12-.35-.18-.36-.26-.36-.36-.35-.46-.32-.59-.28-.73-.21-.88-.14-1.05-.05-1.23.06-1.22.16-1.04.24-.87.32-.71.36-.57.4-.44.42-.33.42-.24.4-.16.36-.1.32-.05.24-.01h.16l.06.01h8.16v-.83H6.18l-.01-2.75-.02-.37.05-.34.11-.31.17-.28.25-.26.31-.23.38-.2.44-.18.51-.15.58-.12.64-.1.71-.06.77-.04.84-.02 1.27.05zm-6.3 1.98l-.23.33-.08.41.08.41.23.34.33.22.41.09.41-.09.33-.22.23-.34.08-.41-.08-.41-.23-.33-.33-.22-.41-.09-.41.09zm13.09 3.95l.28.06.32.12.35.18.36.27.36.35.35.47.32.59.28.73.21.88.14 1.04.05 1.23-.06 1.23-.16 1.04-.24.86-.32.71-.36.57-.4.45-.42.33-.42.24-.4.16-.36.09-.32.05-.24.02-.16-.01h-8.22v.82h5.84l.01 2.76.02.36-.05.34-.11.31-.17.29-.25.25-.31.24-.38.2-.44.17-.51.15-.58.13-.64.09-.71.07-.77.04-.84.01-1.27-.04-1.07-.14-.9-.2-.73-.25-.59-.3-.45-.33-.34-.34-.25-.34-.16-.33-.1-.3-.04-.25-.02-.2.01-.13v-5.34l.05-.64.13-.54.21-.46.26-.38.3-.32.33-.24.35-.2.35-.14.33-.1.3-.06.26-.04.21-.02.13-.01h5.84l.69-.05.59-.14.5-.21.41-.28.33-.32.27-.35.2-.36.15-.36.1-.35.07-.32.04-.28.02-.21V6.07h2.09l.14.01zm-6.47 14.25l-.23.33-.08.41.08.41.23.33.33.23.41.08.41-.08.33-.23.23-.33.08-.41-.08-.41-.23-.33-.33-.23-.41-.08-.41.08z"/>
                      </svg>
                      Python SDK
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                    <a href="/sdk/php">
                      <svg viewBox="0 0 24 24" width="16" height="16" className="mr-2" fill="currentColor">
                        <path d="M12 0C5.372 0 0 2.688 0 6c0 1.599 1.262 3.05 3.24 4.118V13.5c0 1.548.736 2.949 1.968 4.094C6.438 19.732 8.316 21 10.5 21v-2c-1.815 0-3.412-1.078-4.5-2.75l-.001-.012v-.008c-1.05-1.647-1.185-3.49-1.24-5.365-.002-.065-.004-.13-.006-.193l-.003-.041v-.002L4.75 10.5v-2.152C3.447 7.838 2.25 7.061 2.25 6c0-2.044 4.35-4.5 9.75-4.5s9.75 2.456 9.75 4.5c0 1.061-1.197 1.838-2.5 2.348v4.918c0 2.743-4.017 4.871-9.25 4.982V21H10.5c2.183 0 4.062-1.268 5.292-3.256 1.232-1.989 1.968-4.415 1.968-7.109V8.628C19.348 7.638 21 6.8 21 5.625V4.875C21 2.182 16.593 0 12 0Zm0 2.25c-4.35 0-7.5 1.656-7.5 3.75s3.15 3.75 7.5 3.75 7.5-1.656 7.5-3.75-3.15-3.75-7.5-3.75ZM9 3.75V9h1.5V3.75H9Zm3.75 0V9h1.5V3.75h-1.5Z"/>
                      </svg>
                      PHP SDK
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
          
          <div className="lg:col-span-2 space-y-10">
            <section id="authentication">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                <Key className="h-5 w-5" />
                Authentication
              </h2>
              
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <p className="mb-4">
                    The Handwriting Digitizer API uses API keys to authenticate requests. You can manage your API keys from your dashboard.
                  </p>
                  
                  <div className="bg-secondary/70 p-4 rounded-md font-mono text-sm mb-4">
                    <p className="mb-2">// Example: Include API key in the Authorization header</p>
                    <p>Authorization: Bearer YOUR_API_KEY</p>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    Keep your API keys secure. Do not share them in publicly accessible areas such as GitHub, client-side code, etc.
                  </p>
                </CardContent>
              </Card>
            </section>
            
            <section id="rate-limits">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                <RefreshCw className="h-5 w-5" />
                Rate Limits
              </h2>
              
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <p className="mb-4">
                    API requests are subject to rate limiting to ensure fair usage and service stability:
                  </p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span>Free Plan</span>
                      <span className="font-medium">100 requests per day</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Standard Plan</span>
                      <span className="font-medium">1,000 requests per hour</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Professional Plan</span>
                      <span className="font-medium">10,000 requests per hour</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Enterprise Plan</span>
                      <span className="font-medium">Custom limits</span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-2">
                    Rate limit headers are included in all API responses:
                  </p>
                  
                  <div className="bg-secondary/70 p-4 rounded-md font-mono text-sm">
                    <p>X-RateLimit-Limit: 1000</p>
                    <p>X-RateLimit-Remaining: 995</p>
                    <p>X-RateLimit-Reset: 1611356645</p>
                  </div>
                </CardContent>
              </Card>
            </section>
            
            <section id="endpoints">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                <Zap className="h-5 w-5" />
                Endpoints
              </h2>
              
              <Tabs defaultValue="documents">
                <TabsList className="mb-6">
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                  <TabsTrigger value="schemas">Schemas</TabsTrigger>
                  <TabsTrigger value="process">Processing</TabsTrigger>
                  <TabsTrigger value="export">Export</TabsTrigger>
                </TabsList>
                
                <TabsContent value="documents">
                  <Card>
                    <CardHeader>
                      <CardTitle>Document APIs</CardTitle>
                      <CardDescription>Endpoints for managing documents</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">POST</span>
                            <code className="font-mono">/v1/documents</code>
                          </div>
                          <p className="text-sm mb-2">Upload a new document</p>
                          <div className="bg-secondary/70 p-3 rounded-md font-mono text-xs">
                            <p>// Request (multipart/form-data)</p>
                            <p>file: [binary data]</p>
                            <p>name: "patient_records.pdf"</p>
                            <p>type: "medical_form"</p>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">GET</span>
                            <code className="font-mono">/v1/documents</code>
                          </div>
                          <p className="text-sm mb-2">List all documents</p>
                          <div className="bg-secondary/70 p-3 rounded-md font-mono text-xs">
                            <p>// Query parameters</p>
                            <p>limit: 10</p>
                            <p>offset: 0</p>
                            <p>status: "processed"</p>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">GET</span>
                            <code className="font-mono">/v1/documents/{'{document_id}'}</code>
                          </div>
                          <p className="text-sm">Get document details</p>
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">DELETE</span>
                            <code className="font-mono">/v1/documents/{'{document_id}'}</code>
                          </div>
                          <p className="text-sm">Delete a document</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="schemas">
                  <Card>
                    <CardHeader>
                      <CardTitle>Schema APIs</CardTitle>
                      <CardDescription>Endpoints for managing data schemas</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">POST</span>
                            <code className="font-mono">/v1/schemas</code>
                          </div>
                          <p className="text-sm mb-2">Create a new schema</p>
                          <div className="bg-secondary/70 p-3 rounded-md font-mono text-xs">
                            <p>// Request body</p>
                            <p>{`{`}</p>
                            <p>{`  "name": "Medical Form",`}</p>
                            <p>{`  "fields": [`}</p>
                            <p>{`    { "name": "patient_name", "type": "string" },`}</p>
                            <p>{`    { "name": "date_of_birth", "type": "date" },`}</p>
                            <p>{`    { "name": "diagnosis", "type": "text" }`}</p>
                            <p>{`  ]`}</p>
                            <p>{`}`}</p>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">GET</span>
                            <code className="font-mono">/v1/schemas</code>
                          </div>
                          <p className="text-sm">List all schemas</p>
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">GET</span>
                            <code className="font-mono">/v1/schemas/{'{schema_id}'}</code>
                          </div>
                          <p className="text-sm">Get schema details</p>
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">PUT</span>
                            <code className="font-mono">/v1/schemas/{'{schema_id}'}</code>
                          </div>
                          <p className="text-sm">Update a schema</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="process">
                  <Card>
                    <CardHeader>
                      <CardTitle>Processing APIs</CardTitle>
                      <CardDescription>Endpoints for processing documents</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">POST</span>
                            <code className="font-mono">/v1/process</code>
                          </div>
                          <p className="text-sm mb-2">Process a document with a schema</p>
                          <div className="bg-secondary/70 p-3 rounded-md font-mono text-xs">
                            <p>// Request body</p>
                            <p>{`{`}</p>
                            <p>{`  "document_id": "doc_12345",`}</p>
                            <p>{`  "schema_id": "schema_6789",`}</p>
                            <p>{`  "options": {`}</p>
                            <p>{`    "language": "en",`}</p>
                            <p>{`    "enhance_quality": true`}</p>
                            <p>{`  }`}</p>
                            <p>{`}`}</p>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">GET</span>
                            <code className="font-mono">/v1/process/{'{job_id}'}</code>
                          </div>
                          <p className="text-sm">Check processing status</p>
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">POST</span>
                            <code className="font-mono">/v1/process/{'{job_id}'}/cancel</code>
                          </div>
                          <p className="text-sm">Cancel processing job</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="export">
                  <Card>
                    <CardHeader>
                      <CardTitle>Export APIs</CardTitle>
                      <CardDescription>Endpoints for exporting processed data</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">POST</span>
                            <code className="font-mono">/v1/exports</code>
                          </div>
                          <p className="text-sm mb-2">Create data export</p>
                          <div className="bg-secondary/70 p-3 rounded-md font-mono text-xs">
                            <p>// Request body</p>
                            <p>{`{`}</p>
                            <p>{`  "document_ids": ["doc_12345", "doc_67890"],`}</p>
                            <p>{`  "format": "json",`}</p>
                            <p>{`  "include_confidence_scores": true`}</p>
                            <p>{`}`}</p>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">GET</span>
                            <code className="font-mono">/v1/exports/{'{export_id}'}</code>
                          </div>
                          <p className="text-sm">Get export status and download URL</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </section>
            
            <section id="errors">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5" />
                Error Handling
              </h2>
              
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <p className="mb-4">
                    The API uses conventional HTTP response codes to indicate success or failure:
                  </p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-green-500 font-medium">200 - OK</span>
                      <span>Request succeeded</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-500 font-medium">201 - Created</span>
                      <span>Resource was successfully created</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-500 font-medium">400 - Bad Request</span>
                      <span>Invalid request parameters</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-500 font-medium">401 - Unauthorized</span>
                      <span>Missing or invalid API key</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-500 font-medium">403 - Forbidden</span>
                      <span>API key doesn't have permission</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-500 font-medium">404 - Not Found</span>
                      <span>Resource doesn't exist</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-500 font-medium">429 - Too Many Requests</span>
                      <span>Rate limit exceeded</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-destructive font-medium">500, 502, 503, 504 - Server Errors</span>
                      <span>Something went wrong on our end</span>
                    </div>
                  </div>
                  
                  <div className="bg-secondary/70 p-4 rounded-md font-mono text-sm">
                    <p>// Example error response</p>
                    <p>{`{`}</p>
                    <p>{`  "error": {`}</p>
                    <p>{`    "code": "invalid_parameter",`}</p>
                    <p>{`    "message": "The schema_id parameter is required",`}</p>
                    <p>{`    "status": 400,`}</p>
                    <p>{`    "request_id": "req_1234567890"`}</p>
                    <p>{`  }`}</p>
                    <p>{`}`}</p>
                  </div>
                </CardContent>
              </Card>
            </section>
            
            <section id="versions">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                <Code className="h-5 w-5" />
                API Versions
              </h2>
              
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <p className="mb-4">
                    The API version is included in the endpoint URL. The current version is <code>v1</code>.
                  </p>
                  
                  <div className="bg-secondary/70 p-3 rounded-md font-mono text-sm mb-4">
                    <p>https://api.handwritingdigitizer.com/v1/documents</p>
                  </div>
                  
                  <p>
                    When we make backward-incompatible changes to the API, we release a new version. We'll support older versions for at least 12 months after a new version is released.
                  </p>
                </CardContent>
              </Card>
            </section>
            
            <section id="webhooks">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                <Zap className="h-5 w-5" />
                Webhooks
              </h2>
              
              <Card>
                <CardContent className="pt-6">
                  <p className="mb-4">
                    Webhooks allow you to receive real-time notifications when events happen in your account. Configure webhooks in your dashboard.
                  </p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-start gap-2">
                      <div className="bg-primary/10 p-1 rounded-full mt-0.5">
                        <span className="block h-2 w-2 rounded-full bg-primary"></span>
                      </div>
                      <div>
                        <p className="font-medium">document.uploaded</p>
                        <p className="text-sm text-muted-foreground">Triggered when a document is successfully uploaded</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <div className="bg-primary/10 p-1 rounded-full mt-0.5">
                        <span className="block h-2 w-2 rounded-full bg-primary"></span>
                      </div>
                      <div>
                        <p className="font-medium">document.processed</p>
                        <p className="text-sm text-muted-foreground">Triggered when document processing is complete</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <div className="bg-primary/10 p-1 rounded-full mt-0.5">
                        <span className="block h-2 w-2 rounded-full bg-primary"></span>
                      </div>
                      <div>
                        <p className="font-medium">data.extracted</p>
                        <p className="text-sm text-muted-foreground">Triggered when data extraction is complete</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <div className="bg-primary/10 p-1 rounded-full mt-0.5">
                        <span className="block h-2 w-2 rounded-full bg-primary"></span>
                      </div>
                      <div>
                        <p className="font-medium">export.complete</p>
                        <p className="text-sm text-muted-foreground">Triggered when data export is complete</p>
                      </div>
                    </div>
                  </div>
                  
                  <Button asChild>
                    <a href="/documentation/webhooks">Learn More About Webhooks</a>
                  </Button>
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
