import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../services/api.js";

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, passwordHash: string) => Promise<void>;
  register: (name: string, email: string, passwordHash: string, orgName?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      setLoading(false);
      return;
    }
    
    try {
      // Decode JWT token locally to get default session details or hit health/profile route
      // For simplicity and resilience, we decode user details or fetch from simple token profile payload
      const parts = accessToken.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        setUser({
          id: payload.id,
          name: payload.name || "Default User",
          email: payload.email,
        });
      }
    } catch (err) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, passwordHash: string) => {
    setLoading(true);
    try {
      const response = await api.post("/auth/login", { email, passwordHash });
      const { user: userData, accessToken, refreshToken } = response.data.data;
      
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      setUser(userData);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, passwordHash: string, orgName?: string) => {
    setLoading(true);
    try {
      await api.post("/auth/register", { name, email, passwordHash, orgName });
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await api.post("/auth/logout");
    } catch (e) {
      // proceed with local cleanup anyway
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      setUser(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
