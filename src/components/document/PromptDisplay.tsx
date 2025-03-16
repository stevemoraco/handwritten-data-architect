
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getPromptsForDocument } from "@/services/geminiService";
import { DocumentPrompt } from "@/types";
import { MessageSquare, Code, AlertTriangle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PromptDisplayProps {
  documentId: string;
}

export function PromptDisplay({ documentId }: PromptDisplayProps) {
  const [prompts, setPrompts] = React.useState<DocumentPrompt[]>([]);
  const [activeTab, setActiveTab] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadPrompts = React.useCallback(async () => {
    if (!documentId) return;
    
    try {
      setIsLoading(true);
      const promptData = await getPromptsForDocument(documentId);
      setPrompts(promptData);
      
      // Set the first prompt type as the active tab if available
      if (promptData.length > 0) {
        const promptTypes = new Set(promptData.map(p => p.prompt_type));
        const firstType = Array.from(promptTypes)[0];
        setActiveTab(firstType);
      }
      
      setError(null);
    } catch (err) {
      console.error("Error loading prompts:", err);
      setError("Failed to load prompts");
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  React.useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  const filteredPrompts = React.useMemo(() => {
    return activeTab ? prompts.filter(p => p.prompt_type === activeTab) : [];
  }, [prompts, activeTab]);

  const promptTypes = React.useMemo(() => {
    const types = new Set(prompts.map(p => p.prompt_type));
    return Array.from(types);
  }, [prompts]);

  if (isLoading) {
    return (
      <Card className="mt-4">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground animate-pulse">Loading prompts...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mt-4 border-destructive">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (prompts.length === 0) {
    return (
      <Card className="mt-4">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">No prompts available for this document</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          AI Prompts
          <Badge variant="outline" className="ml-2">{prompts.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            {promptTypes.map((type) => (
              <TabsTrigger key={type} value={type} className="capitalize">
                {type.replace('_', ' ')}
              </TabsTrigger>
            ))}
          </TabsList>

          {promptTypes.map((type) => (
            <TabsContent key={type} value={type}>
              {filteredPrompts.length > 0 ? (
                filteredPrompts.map((prompt) => (
                  <div key={prompt.id} className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <Badge variant="outline">
                        {new Date(prompt.created_at).toLocaleString()}
                      </Badge>
                    </div>
                    <ScrollArea className="h-[200px] border rounded-md p-4 bg-muted/10">
                      <div className="whitespace-pre-wrap font-mono text-sm">
                        {prompt.prompt_text}
                      </div>
                    </ScrollArea>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground">No {type.replace('_', ' ')} prompts available</p>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
