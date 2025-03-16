
import * as React from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlusIcon, SaveIcon, UserIcon, UsersIcon, CopyIcon, MailIcon, TrashIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";

// Mock team members data
const TEAM_MEMBERS = [
  {
    id: "user1",
    name: "Jane Smith",
    email: "jane.smith@example.com",
    role: "admin",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jane",
    status: "active"
  },
  {
    id: "user2",
    name: "Bob Johnson",
    email: "bob.johnson@example.com",
    role: "editor",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob",
    status: "active"
  },
  {
    id: "user3", 
    name: "Sarah Williams",
    email: "sarah.williams@example.com",
    role: "viewer",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
    status: "pending"
  }
];

export default function Settings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = React.useState("profile");
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState("viewer");
  const [profileName, setProfileName] = React.useState(user?.name || "");
  const [teamMembers, setTeamMembers] = React.useState(TEAM_MEMBERS);

  const handleSaveProfile = () => {
    toast({
      title: "Profile updated",
      description: "Your profile has been updated successfully."
    });
  };

  const handleInviteUser = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteEmail) {
      toast({
        title: "Email required",
        description: "Please enter an email address to invite a team member.",
        variant: "destructive"
      });
      return;
    }
    
    // In a real app, this would send an invitation
    const newTeamMember = {
      id: `user${teamMembers.length + 1}`,
      name: inviteEmail.split('@')[0],
      email: inviteEmail,
      role: inviteRole,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${inviteEmail}`,
      status: "pending"
    };
    
    setTeamMembers([...teamMembers, newTeamMember]);
    setInviteEmail("");
    
    toast({
      title: "Invitation sent",
      description: `Invitation email sent to ${inviteEmail}`
    });
  };

  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(`https://yourdomain.com/invite?token=sample-invite-token`);
    toast({ 
      title: "Copied to clipboard",
      description: "Invite link has been copied to your clipboard."
    });
  };

  const handleRemoveTeamMember = (userId: string) => {
    setTeamMembers(teamMembers.filter(member => member.id !== userId));
    toast({
      title: "Member removed",
      description: "Team member has been removed successfully."
    });
  };

  const handleChangeRole = (userId: string, newRole: string) => {
    setTeamMembers(teamMembers.map(member => 
      member.id === userId ? { ...member, role: newRole } : member
    ));
    
    toast({
      title: "Role updated",
      description: "Team member's role has been updated."
    });
  };

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="profile">
            <UserIcon className="h-4 w-4 mr-2" /> Profile
          </TabsTrigger>
          <TabsTrigger value="team">
            <UsersIcon className="h-4 w-4 mr-2" /> Team
          </TabsTrigger>
          <TabsTrigger value="preferences">
            <SaveIcon className="h-4 w-4 mr-2" /> Preferences
          </TabsTrigger>
        </TabsList>
        
        <div className="mt-6">
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your account details and personal information.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`} />
                    <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                  <Button variant="outline" size="sm">Change Avatar</Button>
                </div>
                
                <Separator />
                
                <div className="grid gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input 
                        id="fullName"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email"
                        value={user?.email || ""}
                        disabled
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="organization">Organization</Label>
                    <Input 
                      id="organization"
                      placeholder="Enter your organization name"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSaveProfile}>
                  <SaveIcon className="h-4 w-4 mr-2" /> Save Changes
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="team">
            <Card>
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>
                  Manage your team and invite new members.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Current Team Members</h3>
                  <div className="space-y-3">
                    {teamMembers.map(member => (
                      <div key={member.id} className="flex items-center justify-between p-3 rounded-md border">
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarImage src={member.avatarUrl} />
                            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{member.name}</p>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                          </div>
                          {member.status === "pending" && (
                            <Badge variant="outline" className="ml-2">Pending</Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Select 
                            value={member.role} 
                            onValueChange={(value) => handleChangeRole(member.id, value)}
                          >
                            <SelectTrigger className="w-[110px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="editor">Editor</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleRemoveTeamMember(member.id)}
                          >
                            <TrashIcon className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Invite New Team Member</h3>
                  <form onSubmit={handleInviteUser} className="flex flex-wrap gap-3">
                    <div className="flex-1 min-w-[200px]">
                      <Input 
                        placeholder="Email address"
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                    </div>
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button type="submit">
                      <PlusIcon className="h-4 w-4 mr-2" /> Invite
                    </Button>
                  </form>
                  
                  <div className="flex mt-4 items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex gap-2"
                      onClick={handleCopyInviteLink}
                    >
                      <CopyIcon className="h-4 w-4" /> Copy Invite Link
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex gap-2"
                    >
                      <MailIcon className="h-4 w-4" /> Send Bulk Invites
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>Application Preferences</CardTitle>
                <CardDescription>
                  Customize your application experience and notification settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Notifications</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Email Notifications</p>
                        <p className="text-sm text-muted-foreground">Receive email updates about document processing</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Processing Alerts</p>
                        <p className="text-sm text-muted-foreground">Get notified when document processing completes</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Team Activity</p>
                        <p className="text-sm text-muted-foreground">Notifications about team member actions</p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Display Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="defaultView">Default Document View</Label>
                      <Select defaultValue="grid">
                        <SelectTrigger id="defaultView">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="grid">Grid View</SelectItem>
                          <SelectItem value="list">List View</SelectItem>
                          <SelectItem value="table">Table View</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="itemsPerPage">Items Per Page</Label>
                      <Select defaultValue="12">
                        <SelectTrigger id="itemsPerPage">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="8">8 items</SelectItem>
                          <SelectItem value="12">12 items</SelectItem>
                          <SelectItem value="24">24 items</SelectItem>
                          <SelectItem value="48">48 items</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={() => 
                  toast({
                    title: "Preferences saved",
                    description: "Your preferences have been updated successfully."
                  })
                }>
                  <SaveIcon className="h-4 w-4 mr-2" /> Save Preferences
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
