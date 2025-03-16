
import * as React from "react";
import { DocumentSchema } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { extractTableData } from "@/services/documentService";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DownloadIcon, TableIcon } from "lucide-react";

interface SchemaDataViewProps {
  schema: DocumentSchema;
  documentId: string;
}

export function SchemaDataView({ schema, documentId }: SchemaDataViewProps) {
  // In a real implementation, this would fetch the actual data
  // For the demo, we'll use our mock data
  const extractedData = extractTableData("");

  const exportTableToCSV = (tableName: string) => {
    const tableData = extractedData[tableName];
    if (!tableData) return;
    
    const headers = Object.keys(tableData);
    const values = Object.values(tableData);
    
    const csvContent = [
      headers.join(','),
      values.join(',')
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${tableName}.csv`);
    link.click();
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">
          Extracted Data
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={schema.structure[0]?.name || ""}>
          <TabsList className="mb-4 flex flex-wrap gap-2 justify-start">
            {schema.structure.map((table) => (
              <TabsTrigger key={table.id} value={table.name}>
                <TableIcon className="h-4 w-4 mr-2" />
                {table.name}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {schema.structure.map((table) => (
            <TabsContent key={table.id} value={table.name} className="mt-0">
              <div className="flex justify-end mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportTableToCSV(table.name)}
                >
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
              
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Field</TableHead>
                      <TableHead>Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {extractedData[table.name] && Object.entries(extractedData[table.name]).map(([field, value]) => (
                      <TableRow key={field}>
                        <TableCell className="font-medium">{field}</TableCell>
                        <TableCell>{value as string}</TableCell>
                      </TableRow>
                    ))}
                    {!extractedData[table.name] && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center h-24 text-muted-foreground">
                          No data available for this table.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
