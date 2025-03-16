
import * as React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

interface AuthFormProps {
  onComplete?: () => void;
  redirectPath?: string;
}

export function AuthForm({ onComplete, redirectPath = "/process" }: AuthFormProps) {
  const [activeTab, setActiveTab] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, register, user } = useAuth();
  const navigate = useNavigate();

  // If user is already logged in, redirect immediately
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
    
    if (isSubmitting) return; // Prevent multiple submissions
    
    setIsSubmitting(true);
    
    try {
      await login(email, password);
      console.log("Login successful, redirecting to:", redirectPath);
      
      // The login function updates the user state, which will trigger the useEffect above
      // But we'll also handle immediate redirection here in case the state update is delayed
      if (onComplete) {
        onComplete();
      } else {
        navigate(redirectPath);
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "An unknown error occurred. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return; // Prevent multiple submissions
    
    setIsSubmitting(true);
    
    try {
      await register(name, email, password);
      console.log("Registration successful, redirecting to:", redirectPath);
      
      // The register function updates the user state, which will trigger the useEffect above
      // But we'll also handle immediate redirection here in case the state update is delayed
      if (onComplete) {
        onComplete();
      } else {
        navigate(redirectPath);
      }
    } catch (error) {
      console.error("Register error:", error);
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "An unknown error occurred. Please try again.",
        variant: "destructive",
      });
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
    
    // Get the forgotPassword function from useAuth
    const { forgotPassword } = useAuth();
    
    forgotPassword(email)
      .then(() => {
        toast({
          title: "Password reset email sent",
          description: "If an account exists with this email, you'll receive a password reset link.",
        });
      })
      .catch((error) => {
        console.error("Forgot password error:", error);
        toast({
          title: "Password reset failed",
          description: error instanceof Error ? error.message : "An unknown error occurred. Please try again.",
          variant: "destructive",
        });
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  // If already logged in, don't render the form
  if (user) {
    return null;
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="register">Register</TabsTrigger>
        </TabsList>
        
        <TabsContent value="login" className="mt-6">
          <form onSubmit={handleLogin} className="space-y-4">
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
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-xs" 
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isSubmitting}
                >
                  Forgot Password?
                </Button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting}
                className="glass-input"
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Logging in..." : "Login"}
            </Button>
          </form>
        </TabsContent>
        
        <TabsContent value="register" className="mt-6">
          <form onSubmit={handleRegister} className="space-y-4">
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
            
            <div className="space-y-2">
              <Label htmlFor="register-email">Email</Label>
              <Input
                id="register-email"
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
              <Label htmlFor="register-password">Password</Label>
              <Input
                id="register-password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting}
                className="glass-input"
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating account..." : "Create account"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
