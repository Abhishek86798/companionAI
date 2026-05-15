"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { fetchMemories, deleteMemory, fetchPersona, upsertPersona, type MemoryFact, type PersonaData } from "@/lib/api";
import { COPY, type Lang } from "@/lib/copy";

const TONE_DISPLAY: Record<string, string> = {
  funny_chill: "Funny & chill",
  motivating: "Motivating",
  logical: "Logical",
  just_listen: "Just listen",
};

const TONE_OPTIONS = [
  { value: "funny_chill", emoji: "😄", label: "Funny & chill" },
  { value: "motivating", emoji: "💪", label: "Motivating" },
  { value: "logical", emoji: "🧠", label: "Logical" },
  { value: "just_listen", emoji: "🤗", label: "Just listen" },
] as const;

const CATEGORY_ICONS: Record<string, string> = {
  name: "😊",
  city: "📍",
  job: "💼",
  relationship: "❤️",
  situation: "🌀",
  other: "💬",
};

export default function SettingsPage() {
  const { session, user, isLoading, signOut } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [editingPersona, setEditingPersona] = useState(false);
  const [editName, setEditName] = useState("");
  const [editTone, setEditTone] = useState<string | null>(null);
  const [editExpectation, setEditExpectation] = useState("");

  useEffect(() => {
    if (!isLoading && !session) router.replace("/auth");
  }, [session, isLoading, router]);

  const { data: persona } = useQuery({
    queryKey: ["persona"],
    queryFn: () => fetchPersona(session!.access_token),
    enabled: !!session,
  });

  const lang = (persona?.language_pref ?? "hinglish") as Lang;
  const t = COPY[lang].settings;

  const { mutate: savePersona, isPending: savingPersona } = useMutation({
    mutationFn: (data: Partial<PersonaData>) => upsertPersona(data, session!.access_token),
    onSuccess: (updated) => {
      queryClient.setQueryData<PersonaData>(["persona"], updated);
      setEditingPersona(false);
      showToast(t.personaSaved(updated.companion_name), "success");
    },
    onError: () => showToast(t.personaSaveError, "error"),
  });

  const openPersonaEdit = () => {
    setEditName(persona?.companion_name ?? "Arjun");
    setEditTone(persona?.tone ?? null);
    setEditExpectation(persona?.expectation ?? "");
    setEditingPersona(true);
  };

  const {
    data: memories = [],
    isLoading: memoriesLoading,
    error: memoriesError,
    refetch: refetchMemories,
  } = useQuery({
    queryKey: ["memories", session?.access_token],
    queryFn: () => fetchMemories(session!.access_token),
    enabled: !!session,
    staleTime: 30_000,
    retry: 1,
  });

  const { mutate: doDelete } = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      deleteMemory(id, session!.access_token),
    onMutate: ({ id }) => {
      queryClient.setQueryData<MemoryFact[]>(
        ["memories", session?.access_token],
        (old) => old?.filter((m) => m.id !== id) ?? [],
      );
    },
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: ["memories"] });
      showToast(t.memoryDeleteError, "error");
    },
    onSettled: (_, __, { id }) => {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
  });

  const handleDelete = (id: string) => {
    setDeletingIds((prev) => new Set(prev).add(id));
    setTimeout(() => doDelete({ id }), 200);
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/auth");
  };

  if (isLoading || !session) return null;

  const userDisplay = user?.email ?? user?.phone ?? "Your account";

  return (
    <div
      className="w-full overflow-hidden"
      style={{ height: "100dvh", background: "var(--color-bg)" }}
    >
    <div
      className="flex flex-col h-full max-w-[480px] mx-auto overflow-hidden"
    >
      {/* Top bar */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] flex-shrink-0"
        style={{ background: "var(--color-surface)" }}
      >
        <button
          onClick={() => router.push("/chat")}
          aria-label="Back to chat"
          className="w-11 h-11 flex items-center justify-center rounded-full transition-colors hover:bg-[var(--color-elevated)] flex-shrink-0"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[var(--color-text)]"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-base font-semibold text-[var(--color-text)]">
          {t.title}
        </h1>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
        {/* ── Companion ────────────────────────────────────────────────────── */}
        <section>
          <p className="text-xs uppercase text-[var(--color-text-muted)] mb-2 px-1" style={{ letterSpacing: "0.08em" }}>
            {t.sectionCompanion}
          </p>
          <div className="rounded-xl overflow-hidden" style={{ background: "var(--color-surface)" }}>
            {!editingPersona ? (
              <div className="px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-[var(--color-text)]">
                      {persona?.companion_name ?? "Arjun"}
                    </p>
                    {persona?.tone && (
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        {TONE_DISPLAY[persona.tone] ?? persona.tone}
                      </p>
                    )}
                    {persona?.expectation && (
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5 line-clamp-1">
                        {persona.expectation}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={openPersonaEdit}
                    className="text-sm flex-shrink-0 transition-colors"
                    style={{ color: "var(--color-primary)", minHeight: 44 }}
                  >
                    {t.editBtn}
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-4 py-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-[var(--color-text-muted)]">{t.nameLabel}</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value.slice(0, 30))}
                    placeholder="Arjun"
                    className="w-full px-4 py-3 text-sm rounded-xl text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] caret-[var(--color-primary)]"
                    style={{ backgroundColor: "var(--color-elevated)", border: "1px solid var(--color-border)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-2 text-[var(--color-text-muted)]">{t.toneLabel}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TONE_OPTIONS.map((opt) => {
                      const active = editTone === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setEditTone(active ? null : opt.value)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all"
                          style={{
                            backgroundColor: active ? "rgba(255,107,53,0.12)" : "var(--color-elevated)",
                            border: `1px solid ${active ? "rgba(255,107,53,0.5)" : "var(--color-border)"}`,
                          }}
                        >
                          <span>{opt.emoji}</span>
                          <span className="text-xs font-medium" style={{ color: active ? "var(--color-primary)" : "var(--color-text)" }}>
                            {opt.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-[var(--color-text-muted)]">{t.expectationLabel}</label>
                  <textarea
                    value={editExpectation}
                    onChange={(e) => setEditExpectation(e.target.value.slice(0, 500))}
                    placeholder={t.expectationPlaceholder}
                    rows={3}
                    className="w-full px-4 py-3 text-sm rounded-xl text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] caret-[var(--color-primary)] resize-none"
                    style={{ backgroundColor: "var(--color-elevated)", border: "1px solid var(--color-border)" }}
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setEditingPersona(false)}
                    className="flex-1 text-sm font-medium rounded-xl transition-colors"
                    style={{ height: 44, background: "var(--color-elevated)", color: "var(--color-text-muted)" }}
                  >
                    {t.cancel}
                  </button>
                  <button
                    onClick={() => savePersona({ companion_name: editName.trim() || "Arjun", tone: editTone, expectation: editExpectation.trim() || null })}
                    disabled={savingPersona}
                    className="flex-1 text-sm font-semibold text-white rounded-xl transition-all active:scale-[0.97]"
                    style={{ height: 44, backgroundColor: "var(--color-primary)", opacity: savingPersona ? 0.6 : 1 }}
                  >
                    {savingPersona ? t.saving : t.save}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Memories ─────────────────────────────────────────────────────── */}
        <section>
          <p
            className="text-xs uppercase text-[var(--color-text-muted)] mb-2 px-1"
            style={{ letterSpacing: "0.08em" }}
          >
            {t.sectionMemories}
          </p>
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "var(--color-surface)" }}
          >
            {memoriesLoading ? (
              /* Skeleton shimmer — 3 placeholder rows */
              <div className="px-4 py-3 space-y-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div
                      className="w-8 h-8 rounded-full flex-shrink-0"
                      style={{ background: "var(--color-elevated)" }}
                    />
                    <div className="flex-1 space-y-2">
                      <div
                        className="h-2 rounded-full"
                        style={{ width: "3rem", background: "var(--color-elevated)" }}
                      />
                      <div
                        className="h-3 rounded-full"
                        style={{ width: "7rem", background: "var(--color-elevated)" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : memoriesError ? (
              /* Error state */
              <div className="flex flex-col items-center py-7 gap-3">
                <span className="text-2xl" aria-hidden="true">😕</span>
                <span className="text-xs text-center text-[var(--color-text-muted)] px-4">
                  {t.memoriesLoadError}
                </span>
                <button
                  onClick={() => void refetchMemories()}
                  className="text-xs transition-colors"
                  style={{ color: "var(--color-primary)", minHeight: 44 }}
                >
                  {t.memoriesRetry}
                </button>
              </div>
            ) : memories.length === 0 ? (
              /* Empty state */
              <div className="flex flex-col items-center py-7 gap-2">
                <span className="text-3xl" aria-hidden="true">🧠</span>
                <span className="text-xs text-center text-[var(--color-text-muted)] px-4">
                  {t.memoriesEmpty}
                </span>
              </div>
            ) : (
              memories.map((m, i) => (
                <div
                  key={m.id}
                  className={`memory-row${deletingIds.has(m.id) ? " memory-row-exit" : ""}`}
                >
                  {i > 0 && (
                    <div
                      className="mx-4"
                      style={{ height: 1, background: "var(--color-border)" }}
                    />
                  )}
                  <div
                    className="flex items-center px-4"
                    style={{ height: 52 }}
                  >
                    <span className="text-lg mr-3 flex-shrink-0">
                      {CATEGORY_ICONS[m.category] ?? "💬"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[var(--color-text-muted)] capitalize">
                        {m.category}
                      </p>
                      <p className="text-sm text-[var(--color-text)] truncate">
                        {m.fact}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(m.id)}
                      aria-label={`Delete ${m.category} memory`}
                      className="memory-delete-btn ml-3 flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-full transition-colors"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ── Notifications ────────────────────────────────────────────────── */}
        <section>
          <p
            className="text-xs uppercase text-[var(--color-text-muted)] mb-2 px-1"
            style={{ letterSpacing: "0.08em" }}
          >
            {t.sectionNotifications}
          </p>
          <div
            className="rounded-xl"
            style={{ background: "var(--color-surface)" }}
          >
            <div
              className="flex items-center px-4"
              style={{ height: 52 }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[var(--color-text-muted)] mr-3 flex-shrink-0"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className="flex-1 text-sm text-[var(--color-text)]">
                {t.dailyReminder}
              </span>
              <button
                onClick={() => setNotifEnabled((v) => !v)}
                role="switch"
                aria-checked={notifEnabled}
                aria-label="Toggle daily reminder"
                className="relative flex-shrink-0 transition-colors"
                style={{
                  width: 44,
                  height: 26,
                  borderRadius: 13,
                  background: notifEnabled
                    ? "var(--color-primary)"
                    : "var(--color-elevated)",
                }}
              >
                <span
                  className="absolute top-1 transition-transform"
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "#fff",
                    left: 4,
                    transform: notifEnabled
                      ? "translateX(18px)"
                      : "translateX(0)",
                  }}
                />
              </button>
            </div>
          </div>
        </section>

        {/* ── Account ──────────────────────────────────────────────────────── */}
        <section>
          <p
            className="text-xs uppercase text-[var(--color-text-muted)] mb-2 px-1"
            style={{ letterSpacing: "0.08em" }}
          >
            {t.sectionAccount}
          </p>
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "var(--color-surface)" }}
          >
            <div
              className="flex items-center px-4"
              style={{ height: 52 }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[var(--color-text-muted)] mr-3 flex-shrink-0"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span className="flex-1 text-sm text-[var(--color-text)] truncate">
                {userDisplay}
              </span>
            </div>

            <div
              className="mx-4"
              style={{ height: 1, background: "var(--color-border)" }}
            />

            <button
              onClick={handleSignOut}
              className="w-full flex items-center px-4 transition-colors hover:bg-[var(--color-elevated)]"
              style={{ height: 52 }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-3 flex-shrink-0"
                style={{ color: "var(--color-danger)" }}
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span className="text-sm" style={{ color: "var(--color-danger)" }}>
                {t.signOut}
              </span>
            </button>
          </div>
        </section>
      </div>
    </div>
    </div>
  );
}
