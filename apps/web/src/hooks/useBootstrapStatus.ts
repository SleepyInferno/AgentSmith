import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../lib/api";

type BootstrapStatusResponse = { bootstrapRequired: boolean };

export const bootstrapStatusQueryKey = ["bootstrap-status"] as const;

export function useBootstrapStatus() {
  return useQuery({
    queryKey: bootstrapStatusQueryKey,
    queryFn: () => apiGet<BootstrapStatusResponse>("/api/bootstrap-status"),
    staleTime: Infinity, // bootstrap state changes at most once per app lifetime
    retry: false,
  });
}
