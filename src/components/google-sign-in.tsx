"use client";

import { useEffect } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { useGoogleAuth } from "@/lib/google-auth";

export function GoogleSignIn() {
  const { accessToken, setAccessToken } = useGoogleAuth();

  const login = useGoogleLogin({
    onSuccess: (response) => {
      setAccessToken(response.access_token);
      // store expiry — Google tokens last 1 hour, refresh at 50 minutes
      const expiresAt = Date.now() + (response.expires_in ?? 3600) * 1000;
      localStorage.setItem("google_token_expires_at", expiresAt.toString());
    },
    onError: () => {
      console.error("Google login failed");
    },
    scope: "https://www.googleapis.com/auth/drive.readonly",
    // prompt: "none", // silent re-auth when possible
  });

  // auto-refresh: check every minute, re-login silently 10 minutes before expiry
  useEffect(() => {
    if (!accessToken) return;

    const interval = setInterval(() => {
      const expiresAt = localStorage.getItem("google_token_expires_at");
      if (!expiresAt) return;

      const minutesLeft = (parseInt(expiresAt) - Date.now()) / 1000 / 60;

      if (minutesLeft < 10) {
        // token is about to expire, refresh silently
        login();
      }
    }, 60_000); // check every 60 seconds

    return () => clearInterval(interval);
  }, [accessToken, login]);

  if (accessToken) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-green-600 font-medium">
          Google Drive connected
        </span>
        <button
          onClick={() => {
            setAccessToken(null);
            localStorage.removeItem("google_token_expires_at");
          }}
          className="text-sm text-gray-500 underline"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => login()}
      className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
    >
      Connect Google Drive
    </button>
  );
}