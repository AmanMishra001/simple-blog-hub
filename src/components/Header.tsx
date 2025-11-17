import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PenSquare, LogOut, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface HeaderProps {
  user: any;
}

export const Header = ({ user }: HeaderProps) => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error signing out");
    } else {
      toast.success("Signed out successfully");
      navigate("/");
    }
  };

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold text-foreground hover:text-primary transition-colors">
          BlogPlatform
        </Link>
        
        <nav className="flex items-center gap-4">
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/create">
                  <PenSquare className="w-4 h-4 mr-2" />
                  Write
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link to={`/profile/${user.id}`}>
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </Link>
              </Button>
              <Button onClick={handleSignOut} variant="ghost" size="sm">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth">Sign In</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/auth">Get Started</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};
