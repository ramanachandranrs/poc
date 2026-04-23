import { createContext, useContext, useState } from "react";

const RoleContext = createContext(null);

export const ROLES = {
  all: "All Views",
  dealer_principal: "Dealer Principal",
  parts_manager: "Parts Manager",
  logistics_coordinator: "Logistics Coordinator",
};

// Tab visibility per role
export const TAB_VISIBILITY = {
  all:                   ["alerts","overview","inventory","aging","parts","transit","forecast","ai-workspace","customers","roi"],
  dealer_principal:      ["alerts","overview","inventory","aging","forecast","ai-workspace","customers","roi"],
  parts_manager:         ["alerts","parts","ai-workspace"],
  logistics_coordinator: ["alerts","transit","forecast","ai-workspace"],
};

export function RoleProvider({ children }) {
  const [role, setRoleState] = useState(
    () => localStorage.getItem("dealer_ai_role") || "all"
  );

  const setRole = (r) => {
    setRoleState(r);
    localStorage.setItem("dealer_ai_role", r);
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
