import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { fetchPersona, type PersonaData } from "@/lib/api";

const FALLBACK: PersonaData = {
  companion_name: "Arjun",
  tone: null,
  expectation: null,
  open_field: null,
  language_pref: "hinglish",
};

export function usePersona(): PersonaData {
  const { session } = useAuth();
  const { data } = useQuery({
    queryKey: ["persona"],
    queryFn: () => fetchPersona(session!.access_token),
    enabled: !!session?.access_token,
  });
  return data ?? FALLBACK;
}
