import { createContext, useContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";

const RoleContext = createContext(null);

export const TAB_VISIBILITY = {
  mother_warehouse: ["alerts", "overview", "inventory", "aging", "parts", "transit", "forecast", "ai-workspace", "customers", "roi", "users", "ml-status"],
  regional_distributor: ["alerts", "overview", "inventory", "aging", "parts", "transit", "forecast", "ai-workspace", "dealers", "customers"],
  dealership: ["alerts", "inventory", "aging", "parts", "transit", "customers", "forecast"],
};

export function RoleProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("access_token"));
  const [user, setUser] = useState(null);
  
  // To avoid breaking old code that expects `role`
  const role = user?.role || "mother_warehouse";

  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser({
          username: decoded.sub,
          role: decoded.role,
          zone: decoded.zone,
          dealer_id: decoded.dealer_id
        });
        localStorage.setItem("access_token", token);
      } catch (e) {
        console.error("Invalid token", e);
        logout();
      }
    } else {
      setUser(null);
      localStorage.removeItem("access_token");
    }
  }, [token]);

  const login = async (username, password) => {
    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);

    const res = await fetch("http://127.0.0.1:8000/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData
    });

    if (!res.ok) {
      throw new Error("Invalid credentials");
    }

    const data = await res.json();
    localStorage.setItem("access_token", data.access_token);
    setToken(data.access_token);
    window.dispatchEvent(new Event("auth_changed"));
  };

  const logout = () => {
    setToken(null);
    window.dispatchEvent(new Event("auth_changed"));
  };

  // Provide a dummy setRole so AppSidebar doesn't crash if it calls it, 
  // but it won't actually do anything meaningful since role is derived from JWT.
  const setRole = (newRole) => {
    console.warn("setRole called but roles are now strictly driven by JWT claims.");
  };

  return (
    <RoleContext.Provider value={{ token, user, role, login, logout, setRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
