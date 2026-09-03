"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

function GoogleMark() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.46a5.52 5.52 0 0 1-2.4 3.62v3.01h3.88c2.27-2.09 3.55-5.17 3.55-8.66Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.95-2.92l-3.88-3.01c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.26A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.55.38-2.26V6.63H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.37l4-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.63l4 3.11C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

export function GoogleAuthButton({
  label,
  callbackUrl = "/dashboard",
}: {
  label: string;
  callbackUrl?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={loading}
        onClick={async () => {
          setError("");
          setLoading(true);
          try {
            const response = await fetch("/api/auth/providers");
            const providers = response.ok ? await response.json() : null;
            if (!providers?.google) {
              setError(
                "התחברות עם Google לא זמינה בסביבה הזו. יש להגדיר את GOOGLE_CLIENT_ID ו-GOOGLE_CLIENT_SECRET, ולוודא שהם משויכים לסביבה שממנה נטען העמוד — משתנה שמוגדר ל-Production בלבד אינו מגיע לדפלוי של Preview."
              );
              return;
            }
            await signIn("google", { callbackUrl });
          } catch {
            setError("לא ניתן להתחבר עם Google כרגע. נסו שוב.");
          } finally {
            setLoading(false);
          }
        }}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-800 transition-all hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin text-gray-500" /> : <GoogleMark />}
        {label}
      </button>
      {error && (
        <p className="flex items-start gap-2 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
