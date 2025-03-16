
import * as React from "react";
import { Mail, Phone, Globe, MapPin, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";

export default function Contact() {
  const [formState, setFormState] = React.useState({
    name: '',
    email: '',
    message: '',
  });
  
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    setTimeout(() => {
      toast({
        title: "Message sent",
        description: "We've received your message and will respond soon.",
      });
      
      setFormState({
        name: '',
        email: '',
        message: '',
      });
      
      setIsSubmitting(false);
    }, 1500);
  };
  
  return (
    <div className="container py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Contact Us</h1>
      
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="bg-primary/10 p-3 rounded-full mb-3">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-medium mb-1">Email</h3>
              <p className="text-sm text-muted-foreground mb-2">Our friendly team is here to help.</p>
              <a href="mailto:hello@handwritingdigitizer.com" className="text-primary hover:underline">
                hello@handwritingdigitizer.com
              </a>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="bg-primary/10 p-3 rounded-full mb-3">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-medium mb-1">Office</h3>
              <p className="text-sm text-muted-foreground mb-2">Come say hello at our office.</p>
              <address className="not-italic text-sm">
                100 Main Street<br />
                San Francisco, CA 94107
              </address>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="bg-primary/10 p-3 rounded-full mb-3">
                <Phone className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-medium mb-1">Phone</h3>
              <p className="text-sm text-muted-foreground mb-2">Mon-Fri from 8am to 5pm.</p>
              <a href="tel:+1-555-555-5555" className="text-primary hover:underline">
                +1 (555) 555-5555
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl font-semibold mb-4">Get in touch</h2>
          <p className="text-muted-foreground mb-6">
            Have a question about our services or need help with your documents? Fill out the form 
            and our team will get back to you shortly.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="bg-primary/10 p-2 rounded-full mr-3">
                <Globe className="h-4 w-4 text-primary" />
              </div>
              <span>www.handwritingdigitizer.com</span>
            </div>
            
            <div className="flex items-center">
              <div className="bg-primary/10 p-2 rounded-full mr-3">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <span>100 Main Street, San Francisco, CA 94107</span>
            </div>
          </div>
        </div>
        
        <div className="bg-muted/30 p-6 rounded-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Name
              </label>
              <Input 
                id="name" 
                name="name" 
                value={formState.name} 
                onChange={handleChange} 
                placeholder="Your name" 
                required 
                disabled={isSubmitting}
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email
              </label>
              <Input 
                id="email" 
                name="email" 
                type="email" 
                value={formState.email} 
                onChange={handleChange} 
                placeholder="your.email@example.com" 
                required 
                disabled={isSubmitting}
              />
            </div>
            
            <div>
              <label htmlFor="message" className="block text-sm font-medium mb-1">
                Message
              </label>
              <Textarea 
                id="message" 
                name="message" 
                value={formState.message} 
                onChange={handleChange} 
                placeholder="How can we help you?" 
                rows={5} 
                required 
                disabled={isSubmitting}
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send Message"}
              {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
