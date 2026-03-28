import { useQuery } from "@tanstack/react-query";
import { ApiError, apiGet } from "../lib/api";

export type SessionUser = {
  id: string;
  email: string | null;
  displayName: string;
};

type SessionResponse =
  | {
      authenticated: true;
      user: SessionUser;
    }
  | {
      authenticated: false;
    };

export const sessionQueryKey = ["session"] as const;

async function getSession() {
  try {
    return await apiGet<SessionResponse>("/api/me");
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return { authenticated: false } satisfies SessionResponse;
    }

    throw error;
  }
}

export function useSession() {
  const query = useQuery({
    queryKey: sessionQueryKey,
    queryFn: getSession,
    retry: false,
    staleTime: 30_000,
  });

  return {
    ...query,
    authenticated: query.data?.authenticated === true,
    user: query.data?.authenticated ? query.data.user : null,
  };
}
