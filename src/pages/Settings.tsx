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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsersIcon } from "lucide-react";

export default function Settings() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [activeTab, setActiveTab] = React.useState("profile");
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
      
      // Try to extract name from session user metadata or email
      // Access the raw Supabase user object from AuthContext if available
      // This is a workaround since user_metadata isn't in our User type
      const supabaseUser = (user as any)._supabaseUser;
      const userMetadata = supabaseUser?.user_metadata;
      
      const displayName = userMetadata?.full_name || 
                         userMetadata?.name || 
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
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="mb-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="space-y-6">
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
        </TabsContent>
        
        <TabsContent value="notifications" className="space-y-6">
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
        </TabsContent>
        
        <TabsContent value="team" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Management</CardTitle>
              <CardDescription>Manage team members and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                <UsersIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Your Team</h3>
                <p className="text-muted-foreground mb-6">
                  You don't have any team members yet. Add team members to collaborate on document processing.
                </p>
                <Button>
                  Invite Team Members
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
