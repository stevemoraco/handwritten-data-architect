
import * as React from "react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FileText, Github, Loader2, MenuIcon, Twitter } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, isLoading, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navigationItems = [
    { name: "Dashboard", href: "/" },
    { name: "Documents", href: "/documents", requiresAuth: true },
    { name: "Pipelines", href: "/pipelines", requiresAuth: true },
  ];

  const handleNavigation = (item: { name: string; href: string; requiresAuth?: boolean }) => {
    if (item.requiresAuth && !user) {
      navigate(`/auth?redirectTo=${encodeURIComponent(item.href)}`);
      return;
    }
    navigate(item.href);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 w-full border-b backdrop-blur-md bg-background/70">
        <div className="container flex items-center justify-between h-16 px-4 md:px-6">
          <div className="flex items-center gap-6">
            <Link to="/" className="font-semibold tracking-tight text-lg">
              Handwriting Digitizer
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              {navigationItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.requiresAuth && !user ? "#" : item.href}
                  className={cn(
                    "text-sm transition-colors hover:text-primary relative",
                    location.pathname === item.href
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                  onClick={(e) => {
                    if (item.requiresAuth && !user) {
                      e.preventDefault();
                      handleNavigation(item);
                    }
                  }}
                >
                  {item.name}
                  {location.pathname === item.href && (
                    <div className="absolute -bottom-[20px] left-0 right-0 h-[2px] bg-primary animate-fade-in" />
                  )}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {isLoading ? (
              <Button variant="ghost" size="icon" disabled>
                <Loader2 className="h-5 w-5 animate-spin" />
              </Button>
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src="" alt={user.name} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {user.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/settings">Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => signOut()}
                    className="text-destructive focus:text-destructive"
                  >
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button size="sm" onClick={() => navigate('/auth')}>
                Login
              </Button>
            )}
            <Button
              variant="ghost"
              className="md:hidden"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <MenuIcon className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </div>
        </div>
        {isMobileMenuOpen && (
          <div className="md:hidden border-t">
            <div className="container flex flex-col space-y-3 px-4 py-3">
              {navigationItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.requiresAuth && !user ? "#" : item.href}
                  className={cn(
                    "text-sm transition-colors hover:text-primary py-2",
                    location.pathname === item.href
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                  onClick={(e) => {
                    if (item.requiresAuth && !user) {
                      e.preventDefault();
                      handleNavigation(item);
                    } else {
                      setIsMobileMenuOpen(false);
                    }
                  }}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>
      <main className="flex-1">
        {children}
      </main>
      <footer className="border-t py-12 bg-muted/20">
        <div className="container px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-1">
                <FileText className="h-6 w-6 text-primary" />
                <h3 className="text-lg font-bold">Handwriting Digitizer</h3>
              </div>
              <p className="text-muted-foreground text-sm">
                Transform handwritten documents into structured data effortlessly. 
                Built for any organization handling handwritten information.
              </p>
              <div className="flex space-x-3">
                <a 
                  href="https://github.com/stevemoraco/handwritten-data-architect.git" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  <Github className="h-5 w-5" />
                  <span className="sr-only">GitHub</span>
                </a>
                <a 
                  href="https://x.com/stevemoraco" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  <Twitter className="h-5 w-5" />
                  <span className="sr-only">Twitter</span>
                </a>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-base mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/features" className="text-muted-foreground hover:text-primary transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link to="/pricing" className="text-muted-foreground hover:text-primary transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link to="/security" className="text-muted-foreground hover:text-primary transition-colors">
                    Security
                  </Link>
                </li>
                <li>
                  <Link to="/soc2" className="text-muted-foreground hover:text-primary transition-colors">
                    SOC2 Compliance
                  </Link>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-base mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/documentation" className="text-muted-foreground hover:text-primary transition-colors">
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link to="/api" className="text-muted-foreground hover:text-primary transition-colors">
                    API
                  </Link>
                </li>
                <li>
                  <Link to="/help" className="text-muted-foreground hover:text-primary transition-colors">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-base mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t">
            <p className="text-xs text-muted-foreground text-center">
              &copy; {new Date().getFullYear()} Handwriting Digitizer. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
