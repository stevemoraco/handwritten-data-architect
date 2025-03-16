
import * as React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { Separator } from "@/components/ui/separator";

interface AuthFormProps {
  onComplete?: () => void;
  redirectPath?: string;
  initialView?: "login" | "register" | "sign_in" | "sign_up";
}

export function AuthForm({ onComplete, redirectPath = "/process", initialView = "login" }: AuthFormProps) {
  const [activeTab, setActiveTab] = useState(initialView === "sign_in" ? "login" : initialView === "sign_up" ? "register" : initialView);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { signInWithEmail, signUpWithEmail, user, signInWithGoogle, forgotPassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      console.log("User already logged in, redirecting to:", redirectPath);
      if (onComplete) {
        onComplete();
      } else {
        navigate(redirectPath);
      }
    }
  }, [user, onComplete, navigate, redirectPath]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      await signInWithEmail(email, password);
      console.log("Login successful, redirecting to:", redirectPath);
      
      if (onComplete) {
        onComplete();
      } else {
        navigate(redirectPath);
      }
    } catch (error) {
      console.error("Login error:", error);
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      await signUpWithEmail(email, password, name);
      console.log("Registration successful, redirecting to:", redirectPath);
      
      if (onComplete) {
        onComplete();
      } else {
        navigate(redirectPath);
      }
    } catch (error) {
      console.error("Register error:", error);
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = () => {
    if (isSubmitting) return;
    
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address first.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    forgotPassword(email)
      .then(() => {
        toast({
          title: "Password reset email sent",
          description: "If an account exists with this email, you'll receive a password reset link.",
        });
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsSubmitting(true);
      await signInWithGoogle();
      
      // Open popup window for Google auth
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      window.open(
        `${window.location.origin}/auth/callback`,
        'Google Sign In',
        `width=${width},height=${height},left=${left},top=${top}`
      );
    } catch (error) {
      console.error("Google sign in error:", error);
      setIsSubmitting(false);
    }
  };

  if (user) {
    return null;
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={activeTab === "login" ? handleLogin : handleRegister} className="space-y-4">
        {activeTab === "register" && (
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isSubmitting}
              className="glass-input"
            />
          </div>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isSubmitting}
            className="glass-input"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            {activeTab === "login" && (
              <Button 
                variant="link" 
                className="p-0 h-auto text-xs" 
                type="button"
                onClick={handleForgotPassword}
                disabled={isSubmitting}
              >
                Forgot Password?
              </Button>
            )}
          </div>
          <Input
            id="password"
            type="password"
            placeholder={activeTab === "login" ? "Enter your password" : "Create a password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isSubmitting}
            className="glass-input"
          />
        </div>
        
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting 
            ? (activeTab === "login" ? "Logging in..." : "Creating account...") 
            : (activeTab === "login" ? "Login" : "Create account")}
        </Button>
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>
        
        <Button 
          type="button" 
          variant="outline" 
          className="w-full flex items-center justify-center"
          onClick={handleGoogleSignIn}
          disabled={isSubmitting}
        >
          <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" className="mr-2 h-4 w-4">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            <path d="M1 1h22v22H1z" fill="none"/>
          </svg>
          Sign in with Google
        </Button>
      </form>
    </div>
  );
}
