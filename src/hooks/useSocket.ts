import { useContext } from "react";

import { SocketContext, type SocketContextValue } from "@/contexts/socketContextValue";

export function useSocket(): SocketContextValue {
  const context = useContext(SocketContext);
  if (!context) throw new Error("useSocket must be used within SocketProvider.");
  return context;
}
