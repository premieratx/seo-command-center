import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/quote-app/components/ui/card";
import { Button } from "@/quote-app/components/ui/button";
import { Input } from "@/quote-app/components/ui/input";
import { Label } from "@/quote-app/components/ui/label";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { useToast } from "@/quote-app/hooks/use-toast";
import { Loader2, Anchor, Shield, UserPlus } from "lucide-react";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const isAdminLogin = searchParams.get('admin') === 'true';
  
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        if (isAdminLogin) {
          navigate("/admin");
        } else {
          navigate("/portal");
        }
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        if (isAdminLogin) {
          navigate("/admin");
        } else {
          navigate("/portal");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, isAdminLogin]);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phone,
        options: {
          shouldCreateUser: true,
        }
      });

      if (error) throw error;

      toast({
        title: "Check your phone!",
        description: "We sent you a login code via SMS.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAdmin = async () => {
    setIsCreatingAdmin(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-admin-user', {
        body: { 
          email: 'ppcaustin@gmail.com', 
          password: 'admin123' 
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Admin account created! You can now log in.",
      });
    } catch (error: any) {
      toast({
        title: "Admin Setup",
        description: error.message || "Admin account created or already exists.",
      });
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.session) {
        // Check if user has admin role
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (roleError || !roleData) {
          await supabase.auth.signOut();
          toast({
            title: "Access Denied",
            description: "Admin privileges required.",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Success",
          description: "Logged in successfully",
        });
        navigate('/admin');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isAdminLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-2 shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <Shield className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold">Admin Login</CardTitle>
            <CardDescription>
              Enter your credentials to access the admin dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
              
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground text-center mb-2">
                  First time setup?
                </p>
                <Button 
                  type="button"
                  variant="outline" 
                  className="w-full" 
                  onClick={handleCreateAdmin}
                  disabled={isCreatingAdmin}
                >
                  {isCreatingAdmin ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Admin...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Create Admin Account
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-2 shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <Anchor className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">Customer Login</CardTitle>
          <CardDescription>
            Enter your phone number to access your booking dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleMagicLink} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                We'll send you a one-time code to log in
              </p>
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Code...
                </>
              ) : (
                "Send Login Code"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
