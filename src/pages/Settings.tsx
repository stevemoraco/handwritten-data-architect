
import * as React from "react";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "@supabase/supabase-js";

export default function Settings() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [notifications, setNotifications] = React.useState({
    email: true,
    marketing: false,
    security: true,
  });

  // Generate avatar URL based on email or use default
  const avatarUrl = user?.email 
    ? `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(user.email)}`
    : "https://api.dicebear.com/7.x/identicon/svg";

  React.useEffect(() => {
    if (user) {
      // Load user profile data
      setEmail(user.email || "");
      
      // Try to extract name from user metadata or email
      const displayName = user.user_metadata?.full_name || 
                         user.user_metadata?.name || 
                         email.split('@')[0];
      
      setName(displayName || "");
    }
  }, [user, email]);

  const handleUpdateProfile = async () => {
    try {
      // This would update the user's profile in a real app
      toast({
        title: "Profile updated",
        description: "Your profile information has been saved.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out.",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <div className="container py-10">
        <div className="text-center">
          <p>Please sign in to view settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={avatarUrl} alt={name || "User"} />
                <AvatarFallback>{name?.substring(0, 2).toUpperCase() || "U"}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>Manage your account information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Your email cannot be changed</p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handleLogout}>
              Log out
            </Button>
            <Button onClick={handleUpdateProfile}>Save changes</Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>Configure how you receive notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notifications">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications about document processing via email
                </p>
              </div>
              <Switch
                id="email-notifications"
                checked={notifications.email}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, email: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="security-notifications">Security Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified about important security events
                </p>
              </div>
              <Switch
                id="security-notifications"
                checked={notifications.security}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, security: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="marketing-notifications">Marketing</Label>
                <p className="text-sm text-muted-foreground">
                  Receive updates about new features and product announcements
                </p>
              </div>
              <Switch
                id="marketing-notifications"
                checked={notifications.marketing}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, marketing: checked })
                }
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={() => {
              toast({
                title: "Notification preferences saved",
                description: "Your notification settings have been updated.",
              });
            }}>
              Save preferences
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
