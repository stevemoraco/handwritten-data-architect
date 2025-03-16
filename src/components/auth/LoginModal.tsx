
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

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
  redirectPath?: string;
}

export function LoginModal({ open, onOpenChange, onComplete, redirectPath }: LoginModalProps) {
  const handleComplete = () => {
    if (onComplete) onComplete();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Create Your Secure Account
          </DialogTitle>
          <DialogDescription className="flex flex-col space-y-2 pt-2 pb-1">
            <p>
              Your documents contain valuable information. Creating an account ensures your data remains 
              secure and accessible only to you.
            </p>
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 mt-0.5 text-primary" />
              <span className="text-sm">Complete control over your data and processing history</span>
            </div>
          </DialogDescription>
        </DialogHeader>
        <AuthForm onComplete={handleComplete} redirectPath={redirectPath} />
      </DialogContent>
    </Dialog>
  );
}
