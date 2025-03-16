
import * as React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { HelpCircle, Search, FileText, MessageSquare, LifeBuoy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function HelpCenter() {
  return (
    <AppLayout>
      <div className="container py-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <HelpCircle className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Help Center</h1>
        </div>
        
        <div className="mb-8">
          <p className="text-lg mb-4">
            Find answers to your questions about Handwriting Digitizer. Browse our documentation or contact support.
          </p>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input 
              className="pl-10" 
              placeholder="Search for help articles..." 
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Documentation
              </CardTitle>
              <CardDescription>Comprehensive guides and references</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Explore detailed documentation on how to use all features of our platform, from uploading documents to processing and exporting data.
              </p>
              <Button variant="outline" asChild>
                <a href="/documentation">View Documentation</a>
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                FAQ
              </CardTitle>
              <CardDescription>Frequently asked questions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Find answers to common questions about our platform, pricing, security, and supported document types.
              </p>
              <ul className="space-y-2 mb-4">
                <li><a href="#" className="text-primary hover:underline">How accurate is the handwriting recognition?</a></li>
                <li><a href="#" className="text-primary hover:underline">What file formats are supported?</a></li>
                <li><a href="#" className="text-primary hover:underline">How is my data secured?</a></li>
              </ul>
              <Button variant="outline">View All FAQs</Button>
            </CardContent>
          </Card>
          
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LifeBuoy className="h-5 w-5 text-primary" />
                Contact Support
              </CardTitle>
              <CardDescription>Get help from our team</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Can't find what you're looking for? Our support team is ready to assist you with any questions or issues you may have.
              </p>
              <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
                <Button variant="default">
                  Email Support
                </Button>
                <Button variant="outline">
                  Live Chat
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="bg-muted/30 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2">Popular Help Topics</h2>
          <ul className="space-y-2">
            <li><a href="#" className="text-primary hover:underline">Getting started with document uploads</a></li>
            <li><a href="#" className="text-primary hover:underline">Understanding processing steps</a></li>
            <li><a href="#" className="text-primary hover:underline">Exporting and downloading your data</a></li>
            <li><a href="#" className="text-primary hover:underline">Account management and billing</a></li>
            <li><a href="#" className="text-primary hover:underline">API integration guides</a></li>
          </ul>
        </div>
      </div>
    </AppLayout>
  );
}
