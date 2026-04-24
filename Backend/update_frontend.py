import os

# 1. Update useApiData.ts to append token
use_api_data_path = r"c:\Users\RamanachandranRS\Professional\New folder\poc\Frontend\src\hooks\useApiData.ts"
with open(use_api_data_path, "r", encoding="utf-8") as f:
    content = f.read()

# Helper for adding headers
headers_injection = """
    const token = localStorage.getItem("access_token");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
"""

# Update basic fetch
content = content.replace(
    """fetch(`${API_BASE}${endpoint}`, { signal: controller.signal })""",
    """
    const token = localStorage.getItem("access_token");
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    fetch(`${API_BASE}${endpoint}`, { signal: controller.signal, headers })"""
)

# Update fetch in specific helpers
for query in ["/aging/summary", "/wipro/inventory/summary", "/sap/parts/summary", "/rail/transit/summary", "/roi/report", "/forecast/summary"]:
    content = content.replace(
        f"""fetch(`${{API_BASE}}{query}`, {{ signal: controller.signal }})""",
        f"""
    const token = localStorage.getItem("access_token");
    const headers: Record<string, string> = {{}};
    if (token) headers["Authorization"] = `Bearer ${{token}}`;
    fetch(`${{API_BASE}}{query}`, {{ signal: controller.signal, headers }})"""
    )

content = content.replace(
    """fetch(`${API_BASE}/wipro/inventory?${params.toString()}`, { signal: controller.signal })""",
    """
    const token = localStorage.getItem("access_token");
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    fetch(`${API_BASE}/wipro/inventory?${params.toString()}`, { signal: controller.signal, headers })"""
)

content = content.replace(
    """fetch(`${API_BASE}/sap/parts?${params.toString()}`, { signal: controller.signal })""",
    """
    const token = localStorage.getItem("access_token");
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    fetch(`${API_BASE}/sap/parts?${params.toString()}`, { signal: controller.signal, headers })"""
)

content = content.replace(
    """fetch(`${API_BASE}/rail/transit?${params.toString()}`, { signal: controller.signal })""",
    """
    const token = localStorage.getItem("access_token");
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    fetch(`${API_BASE}/rail/transit?${params.toString()}`, { signal: controller.signal, headers })"""
)

content = content.replace(
    """fetch(`${API_BASE}/forecast/variants?${params.toString()}`, { signal: controller.signal })""",
    """
    const token = localStorage.getItem("access_token");
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    fetch(`${API_BASE}/forecast/variants?${params.toString()}`, { signal: controller.signal, headers })"""
)

content = content.replace(
    """fetch(`${API_BASE}/sales/monthly-trend?${params.toString()}`, { signal: controller.signal })""",
    """
    const token = localStorage.getItem("access_token");
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    fetch(`${API_BASE}/sales/monthly-trend?${params.toString()}`, { signal: controller.signal, headers })"""
)

content = content.replace(
    """fetch(`${API_BASE}/sales/by-model`, { signal: controller.signal })""",
    """
    const token = localStorage.getItem("access_token");
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    fetch(`${API_BASE}/sales/by-model`, { signal: controller.signal, headers })"""
)

content = content.replace(
    """fetch(`${API_BASE}/sales/summary`, { signal: controller.signal })""",
    """
    const token = localStorage.getItem("access_token");
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    fetch(`${API_BASE}/sales/summary`, { signal: controller.signal, headers })"""
)

# For callGemini
content = content.replace(
    """headers: { "Content-Type": "application/json" },""",
    """headers: { 
      "Content-Type": "application/json",
      ...(localStorage.getItem("access_token") ? { "Authorization": `Bearer ${localStorage.getItem("access_token")}` } : {})
    },"""
)

# For approveRecommendation
content = content.replace(
    """fetch(`${API_BASE}/guided/approve/${id}?message=${encodeURIComponent(message || "")}`, { method: "POST" });""",
    """fetch(`${API_BASE}/guided/approve/${id}?message=${encodeURIComponent(message || "")}`, { 
    method: "POST",
    headers: localStorage.getItem("access_token") ? { "Authorization": `Bearer ${localStorage.getItem("access_token")}` } : {}
  });"""
)

# For rejectRecommendation
content = content.replace(
    """fetch(`${API_BASE}/guided/reject/${id}?reason=${encodeURIComponent(reason || "")}`, { method: "POST" });""",
    """fetch(`${API_BASE}/guided/reject/${id}?reason=${encodeURIComponent(reason || "")}`, { 
    method: "POST",
    headers: localStorage.getItem("access_token") ? { "Authorization": `Bearer ${localStorage.getItem("access_token")}` } : {}
  });"""
)

with open(use_api_data_path, "w", encoding="utf-8") as f:
    f.write(content)


# 2. Update RoleContext.jsx
role_context_path = r"c:\Users\RamanachandranRS\Professional\New folder\poc\Frontend\src\context\RoleContext.jsx"

new_role_context = """import { createContext, useContext, useState, useEffect } from "react";

const RoleContext = createContext(null);

export const ROLES = {
  mother_warehouse: "Mother Warehouse (Admin)",
  regional_distributor: "Regional Distributor (North)",
  dealership: "Dealership (DLR001)",
};

export const TAB_VISIBILITY = {
  mother_warehouse: ["alerts","overview","inventory","aging","parts","transit","forecast","ai-workspace","customers","roi"],
  regional_distributor: ["alerts","overview","inventory","aging","parts","transit","forecast","ai-workspace"],
  dealership: ["alerts","inventory","aging","parts","transit"],
};

export function RoleProvider({ children }) {
  const [role, setRoleState] = useState(
    () => localStorage.getItem("dealer_ai_role") || "mother_warehouse"
  );

  const fetchToken = async (r) => {
    let username = "admin@maruti.com";
    if (r === "regional_distributor") username = "north_manager@maruti.com";
    if (r === "dealership") username = "dealer_delhi_1@maruti.com";
    
    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", "secret123");

    try {
      const res = await fetch("http://127.0.0.1:8000/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("access_token", data.access_token);
        // Dispatch event so other components know token changed
        window.dispatchEvent(new Event("auth_changed"));
      }
    } catch (e) {
      console.error("Login failed", e);
    }
  };

  useEffect(() => {
    fetchToken(role);
  }, []);

  const setRole = (r) => {
    setRoleState(r);
    localStorage.setItem("dealer_ai_role", r);
    fetchToken(r);
  };

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
"""

with open(role_context_path, "w", encoding="utf-8") as f:
    f.write(new_role_context)

print("Frontend updated successfully!")
