"use client";

import { useGoogleLogin } from "@react-oauth/google";
import { useGoogleAuth } from "@/lib/google-auth";

export function GoogleSignIn() {
  const { accessToken, setAccessToken } = useGoogleAuth();

  const login = useGoogleLogin({
    onSuccess: (response) => {
      setAccessToken(response.access_token);
    },
    onError: () => {
      console.error("Google login failed");
    },
    scope: "https://www.googleapis.com/auth/drive.readonly",
  });

  if (accessToken) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-green-600 font-medium">
          Google Drive connected
        </span>
        <button
          onClick={() => setAccessToken(null)}
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