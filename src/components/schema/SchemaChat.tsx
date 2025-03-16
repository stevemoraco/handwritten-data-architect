
import * as React from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChatMessage } from "@/types";
import { SendIcon, BotIcon, UserIcon } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

interface SchemaChatProps {
  schemaId: string;
  onSchemaUpdate?: () => void;
}

export function SchemaChat({ schemaId, onSchemaUpdate }: SchemaChatProps) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      id: uuidv4(),
      role: "assistant",
      content: "I've analyzed your documents and generated a schema. Is there anything you'd like me to adjust or explain about the schema design?",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate AI processing
    setTimeout(() => {
      // Mock AI responses based on user input
      let responseContent = "";
      
      if (input.toLowerCase().includes("add") || input.toLowerCase().includes("include")) {
        responseContent = "I can add that to the schema. What specific fields or tables would you like me to include?";
      } else if (input.toLowerCase().includes("remove") || input.toLowerCase().includes("delete")) {
        responseContent = "I can remove that from the schema. Which specific part would you like me to remove?";
      } else if (input.toLowerCase().includes("explain") || input.toLowerCase().includes("why")) {
        responseContent = "The schema was designed to capture all the key information from your medical questionnaires while maintaining flexibility for variations in form layout and content. Each table represents a logical grouping of related information, making it easier to query and analyze the data later.";
      } else {
        responseContent = "I understand your feedback about the schema. Would you like me to make specific changes to the tables or fields, or would you prefer me to generate an alternative approach?";
      }

      const aiMessage: ChatMessage = {
        id: uuidv4(),
        role: "assistant",
        content: responseContent,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMessage]);
      setIsLoading(false);
      
      // Notify parent about the update if needed
      if (onSchemaUpdate) {
        onSchemaUpdate();
      }
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="px-4 py-3 border-b">
        <CardTitle className="text-md">Schema Feedback</CardTitle>
      </CardHeader>
      
      <CardContent className="p-0 flex-grow overflow-hidden">
        <ScrollArea className="h-[400px] p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`flex gap-3 max-w-[80%] ${
                    message.role === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className={message.role === "user" ? "bg-primary/10" : "bg-secondary"}>
                      {message.role === "user" ? <UserIcon className="h-4 w-4" /> : <BotIcon className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div
                    className={`rounded-lg px-4 py-2 text-sm ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <div className="mt-1 text-xs opacity-70">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>
      
      <CardFooter className="p-4 pt-2 border-t">
        <div className="flex w-full gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your feedback or questions about the schema..."
            className="min-h-[80px] flex-1"
            disabled={isLoading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            className="self-end"
          >
            <SendIcon className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
