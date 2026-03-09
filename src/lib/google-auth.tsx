"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { createContext, useContext, useState, ReactNode } from "react";

interface GoogleAuthState {
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
}

const GoogleAuthContext = createContext<GoogleAuthState>({
  accessToken: null,
  setAccessToken: () => {},
});

export function useGoogleAuth() {
  return useContext(GoogleAuthContext);
}

export function GoogleAuthWrapper({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set");
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <GoogleAuthContext.Provider value={{ accessToken, setAccessToken }}>
        {children}
      </GoogleAuthContext.Provider>
    </GoogleOAuthProvider>
  );
}