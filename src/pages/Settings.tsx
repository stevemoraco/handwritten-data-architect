
import * as React from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { Check, Copy, Mail, User, Users, Shield, Bell, Trash2, Plus, Loader2 } from "lucide-react";

// Mock team members data
const TEAM_MEMBERS = [
  {
    id: "1",
    name: "Alex Johnson",
    email: "alex@example.com",
    role: "Admin",
    avatarUrl: "",
    status: "active" as const,
  },
  {
    id: "2",
    name: "Sam Taylor",
    email: "sam@example.com",
    role: "Member",
    avatarUrl: "",
    status: "active" as const,
  },
  {
    id: "3",
    name: "Jamie Smith",
    email: "jamie@example.com",
    role: "Member",
    avatarUrl: "",
    status: "invited" as const,
  }
];

export default function Settings() {
  const { user, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState("account");
  const [pending, setPending] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [teamMembers, setTeamMembers] = React.useState(TEAM_MEMBERS);
  const [notificationSettings, setNotificationSettings] = React.useState({
    emailDocumentUpdates: true,
    emailWeeklySummary: true,
    browserNotifications: false,
    systemNotifications: true
  });

  React.useEffect(() => {
    if (!isLoading && !user) {
      navigate("/");
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="container py-10 flex justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleSaveProfile = () => {
    setPending(true);
    setTimeout(() => {
      setPending(false);
      toast({
        title: "Profile updated",
        description: "Your profile information has been saved."
      });
    }, 1000);
  };

  const handleInviteMember = () => {
    if (!inviteEmail) {
      toast({
        title: "Email required",
        description: "Please enter an email address to send an invitation.",
        variant: "destructive"
      });
      return;
    }

    setPending(true);
    setTimeout(() => {
      setTeamMembers([
        ...teamMembers, 
        {
          id: Date.now().toString(),
          name: "",
          email: inviteEmail,
          role: "Member",
          avatarUrl: "",
          status: "invited"
        }
      ]);
      
      setInviteEmail("");
      setPending(false);
      
      toast({
        title: "Invitation sent",
        description: `An invitation has been sent to ${inviteEmail}.`
      });
    }, 1000);
  };

  const handleRemoveMember = (memberId: string) => {
    setPending(true);
    setTimeout(() => {
      setTeamMembers(teamMembers.filter(member => member.id !== memberId));
      setPending(false);
      
      toast({
        title: "Team member removed",
        description: "The team member has been removed from your organization."
      });
    }, 500);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText("sk_test_YOUR_MOCK_API_KEY_12345");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    toast({
      title: "API key copied",
      description: "The API key has been copied to your clipboard."
    });
  };

  const handleToggleNotification = (setting: keyof typeof notificationSettings) => {
    setNotificationSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
    
    toast({
      title: "Notification setting updated",
      description: "Your notification preferences have been saved."
    });
  };

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-4">
          <TabsTrigger value="account" className="gap-2">
            <User className="h-4 w-4" /> Account
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" /> Team
          </TabsTrigger>
          <TabsTrigger value="api" className="gap-2">
            <Shield className="h-4 w-4" /> API Keys
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" /> Notifications
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="account" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your account profile details and settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-lg bg-primary/10">{user.email ? getInitials(user.email.split('@')[0]) : '?'}</AvatarFallback>
                </Avatar>
                <Button variant="outline">
                  Change Avatar
                </Button>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" defaultValue={user.email ? user.email.split('@')[0] : ''} />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" defaultValue={user.email} disabled />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input id="company" placeholder="Your company name" />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline">Cancel</Button>
              <Button onClick={handleSaveProfile} disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : 'Save Changes'}
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Account Preferences</CardTitle>
              <CardDescription>
                Manage your account settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Dark Mode</p>
                  <p className="text-sm text-muted-foreground">Use dark theme for the application</p>
                </div>
                <Switch defaultChecked={false} />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Document Auto-Save</p>
                  <p className="text-sm text-muted-foreground">Automatically save document changes</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="team" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>
                    Manage your team members and their access
                  </CardDescription>
                </div>
                <Badge variant="outline" className="ml-2">
                  {teamMembers.filter(m => m.status === 'active').length} active / {teamMembers.length} total
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {teamMembers.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/20">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10">{getInitials(member.name || member.email)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.name || 'Pending Invitation'}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                          {member.status === 'invited' && (
                            <Badge variant="outline" className="text-xs">Invited</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>{member.role}</Badge>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex-col space-y-4">
              <div className="flex w-full gap-2">
                <Input 
                  placeholder="Email address" 
                  value={inviteEmail} 
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
                <Button 
                  onClick={handleInviteMember} 
                  disabled={pending || !inviteEmail}
                >
                  {pending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Invite
                    </>
                  )}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="api" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Manage your API keys for integrating with our services
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-muted-foreground mb-4">
                Use these API keys to authenticate requests with our API. Keep them secure!
              </p>
              
              <div className="space-y-4">
                <div className="p-4 border rounded-md">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <p className="font-medium">Production API Key</p>
                      <p className="text-xs text-muted-foreground">Use for live integrations</p>
                    </div>
                    <Badge>Production</Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-muted rounded text-sm font-mono">
                      sk_test_••••••••••••••••••••••••
                    </code>
                    <Button variant="outline" size="icon" onClick={copyApiKey}>
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <div className="p-4 border rounded-md">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <p className="font-medium">Development API Key</p>
                      <p className="text-xs text-muted-foreground">Use for testing and development</p>
                    </div>
                    <Badge variant="outline">Development</Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-muted rounded text-sm font-mono">
                      sk_dev_••••••••••••••••••••••••
                    </code>
                    <Button variant="outline" size="icon" onClick={copyApiKey}>
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Generate New Key
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Manage how and when you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive document updates via email</p>
                  </div>
                  <Switch 
                    checked={notificationSettings.emailDocumentUpdates}
                    onCheckedChange={() => handleToggleNotification('emailDocumentUpdates')}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Weekly Summary</p>
                    <p className="text-sm text-muted-foreground">Receive weekly usage and activity summary</p>
                  </div>
                  <Switch 
                    checked={notificationSettings.emailWeeklySummary}
                    onCheckedChange={() => handleToggleNotification('emailWeeklySummary')}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Browser Notifications</p>
                    <p className="text-sm text-muted-foreground">Show notifications in your browser</p>
                  </div>
                  <Switch 
                    checked={notificationSettings.browserNotifications}
                    onCheckedChange={() => handleToggleNotification('browserNotifications')}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">System Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive notifications about system updates</p>
                  </div>
                  <Switch 
                    checked={notificationSettings.systemNotifications}
                    onCheckedChange={() => handleToggleNotification('systemNotifications')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
