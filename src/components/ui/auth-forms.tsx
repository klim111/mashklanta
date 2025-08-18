"use client";

import { useState } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./dialog";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface AuthFormsProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "login" | "signup";
}

export function AuthForms({ isOpen, onClose, mode }: AuthFormsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();
  const { data: session } = useSession();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError("");
    setSuccess("");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || data.details || "Signup failed";
        throw new Error(errorMessage);
      }

      setSuccess("Account created successfully! You can now log in.");
      
      // Store credentials for auto-login before clearing form
      const emailForLogin = formData.email;
      const passwordForLogin = formData.password;
      
      setFormData({ name: "", email: "", password: "", confirmPassword: "" });
      
      // Auto-login after successful signup
      setTimeout(() => {
        signIn("credentials", {
          email: emailForLogin,
          password: passwordForLogin,
          redirect: false,
        }).then((result) => {
          if (result?.ok) {
            onClose();
            router.refresh();
          }
        });
      }, 1000);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Signup failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else if (result?.ok) {
        setSuccess("Login successful!");
        onClose();
        router.refresh();
      }
    } catch (error) {
      setError("Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = mode === "signup" ? handleSignup : handleLogin;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "signup" ? "הרשמה למערכת" : "התחברות למערכת"}
          </DialogTitle>
          <DialogDescription>
            {mode === "signup" 
              ? "צור חשבון חדש כדי להתחיל" 
              : "התחבר לחשבון הקיים שלך"
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <Label htmlFor="name">שם מלא</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="שם מלא"
                value={formData.name}
                onChange={handleInputChange}
                required
                disabled={isLoading}
              />
            </div>
          )}

          <div>
            <Label htmlFor="email">אימייל</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleInputChange}
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="password">סיסמה</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleInputChange}
              required
              disabled={isLoading}
            />
          </div>

          {mode === "signup" && (
            <div>
              <Label htmlFor="confirmPassword">אימות סיסמה</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                disabled={isLoading}
              />
            </div>
          )}

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          {success && (
            <div className="text-green-500 text-sm">{success}</div>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading 
              ? "מעבד..." 
              : mode === "signup" 
                ? "הרשמה" 
                : "התחברות"
            }
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            {mode === "signup" ? (
              <>
                כבר יש לך חשבון?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ name: "", email: "", password: "", confirmPassword: "" });
                    setError("");
                    setSuccess("");
                  }}
                  className="text-primary underline"
                >
                  התחבר
                </button>
              </>
            ) : (
              <>
                אין לך חשבון?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ name: "", email: "", password: "", confirmPassword: "" });
                    setError("");
                    setSuccess("");
                  }}
                  className="text-primary underline"
                >
                  הירשם
                </button>
              </>
            )}
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}