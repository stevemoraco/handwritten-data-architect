
import * as React from "react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MenuIcon } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { LoginModal } from "@/components/auth/LoginModal";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [showLoginModal, setShowLoginModal] = React.useState(false);
  const [loginRedirectPath, setLoginRedirectPath] = React.useState("");

  const navigationItems = [
    { name: "Dashboard", href: "/" },
    { name: "Documents", href: "/documents", requiresAuth: true },
    { name: "Pipelines", href: "/pipelines", requiresAuth: true },
  ];

  const handleNavigation = (item: { name: string; href: string; requiresAuth?: boolean }) => {
    if (item.requiresAuth && !user) {
      setLoginRedirectPath(item.href);
      setShowLoginModal(true);
      return;
    }
    // No need to use navigate here as the Link component will handle the navigation
  };

  const handleLoginComplete = () => {
    setShowLoginModal(false);
    // We would navigate to the redirect path here, but that functionality will be 
    // implemented when those pages are created
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
            {user ? (
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
                    onClick={() => logout()}
                    className="text-destructive focus:text-destructive"
                  >
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button size="sm" onClick={() => setShowLoginModal(true)}>
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
        <div className="container py-6 px-4 md:px-6 md:py-8">
          {children}
        </div>
      </main>
      <footer className="border-t py-4 md:py-6">
        <div className="container flex flex-col-reverse sm:flex-row items-center justify-between gap-4 px-4 md:px-6">
          <p className="text-xs text-muted-foreground text-center sm:text-left">
            &copy; {new Date().getFullYear()} Handwriting Digitizer. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link to="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Terms of Service
            </Link>
            <Link to="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
      
      <LoginModal 
        open={showLoginModal} 
        onOpenChange={setShowLoginModal}
        onComplete={handleLoginComplete}
      />
    </div>
  );
}
