
import { useState } from "react";
import { DocumentSchema } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Pencil, AlertTriangle, Info, Table, CheckCheck, MessageSquare } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SchemaDetailProps {
  schema: DocumentSchema;
  onApprove: () => void;
  onModify: () => void;
  extractedData?: any;
}

export function SchemaDetail({ schema, onApprove, onModify, extractedData }: SchemaDetailProps) {
  const [activeTab, setActiveTab] = useState("structure");
  const [expandedAccordions, setExpandedAccordions] = useState<string[]>(
    schema.structure.map((table) => table.id)
  );

  const toggleAccordion = (accordionId: string) => {
    setExpandedAccordions(prev => 
      prev.includes(accordionId) 
        ? prev.filter(id => id !== accordionId) 
        : [...prev, accordionId]
    );
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'add':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'modify':
        return <Pencil className="h-4 w-4 text-amber-500" />;
      case 'remove':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{schema.name}</CardTitle>
            <CardDescription>{schema.description}</CardDescription>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <Table className="h-3.5 w-3.5" />
            {schema.structure.length} tables
          </Badge>
        </div>
      </CardHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="px-6">
          <TabsList className="w-full">
            <TabsTrigger value="structure" className="flex-1">
              <Table className="h-4 w-4 mr-2" />
              Schema Structure
            </TabsTrigger>
            <TabsTrigger value="rationale" className="flex-1">
              <Info className="h-4 w-4 mr-2" />
              Rationale
            </TabsTrigger>
            <TabsTrigger value="extracted" className="flex-1" disabled={!extractedData}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Example Data
            </TabsTrigger>
          </TabsList>
        </div>
        
        <CardContent className="pt-4">
          <TabsContent value="structure" className="m-0">
            <ScrollArea className="h-[420px] pr-4">
              <Accordion
                type="multiple"
                value={expandedAccordions}
                className="w-full"
              >
                {schema.structure.map((table) => (
                  <AccordionItem 
                    key={table.id} 
                    value={table.id}
                    className="border rounded-md p-2 mb-3"
                  >
                    <div className="flex items-center justify-between">
                      <AccordionTrigger
                        onClick={() => toggleAccordion(table.id)}
                        className="hover:no-underline py-2"
                      >
                        <div className="flex items-center gap-2">
                          <Table className="h-4 w-4" />
                          <span className="font-medium">{table.name}</span>
                        </div>
                      </AccordionTrigger>
                      <Badge variant="outline" className="mr-4">
                        {table.fields.length} fields
                      </Badge>
                    </div>
                    
                    <AccordionContent className="pt-2">
                      <p className="text-sm text-muted-foreground mb-3">
                        {table.description}
                      </p>
                      
                      <div className="border rounded-md overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted">
                              <th className="text-left font-medium p-2">Field</th>
                              <th className="text-left font-medium p-2">Type</th>
                              <th className="text-left font-medium p-2">Required</th>
                            </tr>
                          </thead>
                          <tbody>
                            {table.fields.map((field) => (
                              <tr key={field.id} className="border-t">
                                <td className="p-2">
                                  <div className="font-medium">{field.name}</div>
                                  {field.description && (
                                    <div className="text-xs text-muted-foreground">
                                      {field.description}
                                    </div>
                                  )}
                                </td>
                                <td className="p-2">
                                  <Badge variant="outline">
                                    {field.type}
                                    {field.type === 'enum' && field.enumValues && field.enumValues.length > 0 && (
                                      <span className="text-xs ml-1">
                                        ({field.enumValues.join(', ')})
                                      </span>
                                    )}
                                  </Badge>
                                </td>
                                <td className="p-2">
                                  {field.required ? (
                                    <Badge variant="default" className="bg-green-500">Yes</Badge>
                                  ) : (
                                    <Badge variant="outline">No</Badge>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="rationale" className="m-0">
            <ScrollArea className="h-[420px] pr-4">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Schema Rationale</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {schema.rationale}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Suggested Improvements</h3>
                  <div className="space-y-3">
                    {schema.suggestions.map((suggestion) => (
                      <div 
                        key={suggestion.id} 
                        className="flex items-start gap-3 border rounded-md p-3"
                      >
                        <div className="mt-0.5">
                          {getSuggestionIcon(suggestion.type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{suggestion.description}</span>
                            <Badge variant="outline" className="capitalize">
                              {suggestion.type}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            <span className="font-medium">Impact:</span> {suggestion.impact}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="extracted" className="m-0">
            {extractedData ? (
              <ScrollArea className="h-[420px] pr-4">
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-lg font-medium">Extracted Sample Data</h3>
                      {extractedData.confidence && (
                        <Badge variant="outline">
                          Confidence: {(extractedData.confidence * 100).toFixed(0)}%
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-4">
                      Below is sample data extracted from the document using the generated schema.
                      This demonstrates how the schema captures the document content.
                    </p>
                    
                    <div className="space-y-4">
                      {extractedData.extractedData && Object.entries(extractedData.extractedData).map(([tableName, fieldValues]: [string, any]) => (
                        <div key={tableName} className="border rounded-md overflow-hidden">
                          <div className="bg-muted px-3 py-2 font-medium flex items-center gap-2">
                            <Table className="h-4 w-4" />
                            {tableName}
                          </div>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-muted/50 border-t">
                                <th className="text-left font-medium p-2">Field</th>
                                <th className="text-left font-medium p-2">Value</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(fieldValues).map(([fieldName, value]: [string, any]) => (
                                <tr key={fieldName} className="border-t">
                                  <td className="p-2 font-medium">{fieldName}</td>
                                  <td className="p-2">{value === null ? <span className="text-muted-foreground italic">Empty</span> : String(value)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            ) : (
              <div className="flex items-center justify-center h-[420px]">
                <div className="text-center text-muted-foreground">
                  <p>No extracted data available yet.</p>
                </div>
              </div>
            )}
          </TabsContent>
        </CardContent>
      </Tabs>
      
      <CardFooter className="flex justify-between pt-2 border-t">
        <Button
          variant="outline"
          onClick={onModify}
          className="gap-2"
        >
          <MessageSquare className="h-4 w-4" />
          Request Changes
        </Button>
        
        <Button
          onClick={onApprove}
          className="gap-2"
        >
          <CheckCircle2 className="h-4 w-4" />
          Approve Schema
        </Button>
      </CardFooter>
    </Card>
  );
}
