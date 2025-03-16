
import * as React from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { User, Shield } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
  redirectPath?: string;
}

export function LoginModal({ open, onOpenChange, onComplete, redirectPath }: LoginModalProps) {
  const [activeTab, setActiveTab] = React.useState<"login" | "register">("register");
  
  const handleComplete = () => {
    if (onComplete) onComplete();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-center">
            <User className="h-5 w-5" />
            {activeTab === "register" ? "Create Your Account" : "Welcome Back"}
          </DialogTitle>
          <DialogDescription className="flex flex-col space-y-2 pt-2 pb-1 text-center">
            {activeTab === "register" ? (
              <p>
                Your documents contain valuable information. Creating an account ensures your data remains 
                secure and accessible only to you.
              </p>
            ) : (
              <p>
                Sign in to continue processing your documents and accessing your data.
              </p>
            )}
            <div className="flex items-start justify-center gap-2">
              <Shield className="h-4 w-4 mt-0.5 text-primary" />
              <span className="text-sm">Complete control over your data and processing history</span>
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="register" value={activeTab} onValueChange={(value) => setActiveTab(value as "login" | "register")}>
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="login">Log In</TabsTrigger>
            <TabsTrigger value="register">Sign Up</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <AuthForm onComplete={handleComplete} redirectPath={redirectPath} initialView="login" />
          </TabsContent>
          <TabsContent value="register">
            <AuthForm onComplete={handleComplete} redirectPath={redirectPath} initialView="register" />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
