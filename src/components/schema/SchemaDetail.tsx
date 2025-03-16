
import * as React from "react";
import { DocumentSchema, SchemaTable } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DatabaseIcon, LightbulbIcon, TableIcon } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface SchemaDetailProps {
  schema: DocumentSchema;
  onApprove?: () => void;
  onModify?: () => void;
}

export function SchemaDetail({ schema, onApprove, onModify }: SchemaDetailProps) {
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center justify-between">
          <span>Proposed Schema: {schema.name}</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onModify}>
              Request Changes
            </Button>
            <Button onClick={onApprove}>
              Approve Schema
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="structure">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="structure">
              <DatabaseIcon className="h-4 w-4 mr-2" />
              Structure
            </TabsTrigger>
            <TabsTrigger value="rationale">
              <TableIcon className="h-4 w-4 mr-2" />
              Rationale
            </TabsTrigger>
            <TabsTrigger value="suggestions">
              <LightbulbIcon className="h-4 w-4 mr-2" />
              Suggestions
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="structure" className="mt-0">
            <ScrollArea className="h-[600px] w-full pr-4">
              <div className="space-y-6">
                {schema.structure.sort((a, b) => a.displayOrder - b.displayOrder).map((table) => (
                  <SchemaTableCard key={table.id} table={table} />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="rationale" className="mt-0">
            <Card className="bg-muted/20 shadow-none border">
              <CardContent className="p-6">
                <h3 className="text-lg font-medium mb-3">Design Rationale</h3>
                <p className="leading-relaxed text-muted-foreground">
                  {schema.rationale}
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="suggestions" className="mt-0">
            <ScrollArea className="h-[600px] w-full pr-4">
              <div className="space-y-4">
                {schema.suggestions.map((suggestion) => (
                  <Card key={suggestion.id} className="bg-muted/20 shadow-none border">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="mt-0.5">
                          <Badge
                            variant={
                              suggestion.type === "add"
                                ? "default"
                                : suggestion.type === "modify"
                                ? "outline"
                                : "secondary"
                            }
                          >
                            {suggestion.type}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <p className="font-medium">{suggestion.description}</p>
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium">Impact:</span> {suggestion.impact}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface SchemaTableCardProps {
  table: SchemaTable;
}

function SchemaTableCard({ table }: SchemaTableCardProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-base">{table.name}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-4 pb-0">
          <p className="text-sm text-muted-foreground">{table.description}</p>
        </div>
        <div className="p-4">
          <Accordion type="multiple" className="w-full">
            <AccordionItem value="fields" className="border-none">
              <AccordionTrigger className="py-2 px-4 hover:bg-muted/50 rounded-md">
                <span className="text-sm font-medium">Fields ({table.fields.length})</span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 py-2">
                  {table.fields.sort((a, b) => a.displayOrder - b.displayOrder).map((field) => (
                    <div
                      key={field.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 rounded-md hover:bg-muted/20"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{field.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {field.description}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">
                          {field.type}
                        </Badge>
                        {field.required && (
                          <Badge>required</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </CardContent>
    </Card>
  );
}
