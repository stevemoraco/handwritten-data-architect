
import * as React from "react";
import { FileText, BarChart, Database, Shield, Zap, Sparkles } from "lucide-react";

export default function Features() {
  const features = [
    {
      icon: <FileText className="h-10 w-10 text-primary" />,
      title: "Document Recognition",
      description: "Our AI accurately recognizes handwritten text from medical forms, legal documents, and more."
    },
    {
      icon: <Database className="h-10 w-10 text-primary" />,
      title: "Structured Data Output",
      description: "Export your digitized data in various formats including CSV, JSON, or directly to your database."
    },
    {
      icon: <BarChart className="h-10 w-10 text-primary" />,
      title: "Analytics Dashboard",
      description: "Track document processing metrics, team efficiency, and extract valuable insights."
    },
    {
      icon: <Shield className="h-10 w-10 text-primary" />,
      title: "Enterprise Security",
      description: "Bank-level encryption and SOC2 compliance ensure your data remains secure."
    },
    {
      icon: <Zap className="h-10 w-10 text-primary" />,
      title: "Processing Speed",
      description: "Process thousands of documents in minutes with our high-performance cloud infrastructure."
    },
    {
      icon: <Sparkles className="h-10 w-10 text-primary" />,
      title: "AI-Assisted Schema Creation",
      description: "Our AI helps you create the perfect data structure for your specific document types."
    }
  ];

  return (
    <div className="container py-8">
      <div className="max-w-3xl mx-auto text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Features</h1>
        <p className="text-xl text-muted-foreground">
          Transform handwritten documents into structured data with our powerful AI tools
        </p>
      </div>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map((feature, index) => (
          <div key={index} className="bg-card rounded-lg border p-6 hover:shadow-md transition-shadow">
            <div className="mb-4">{feature.icon}</div>
            <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
            <p className="text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
