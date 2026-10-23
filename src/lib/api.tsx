import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Model = { id: string; name: string; vendor: string; kind: "image" | "video"; tag: string; blurb: string; res: string; cost: number; badge?: string; audio?: boolean };
export type Tool = { id: string; name: string; blurb: string; needs: string[]; cost: number };
export type StudioField = { key: string; label: string; placeholder: string };
export type Studio = { id: string; name: string; blurb: string; model: string; ratio: string; accent: string; fields: StudioField[]; template: string };
export type Reference = { id: string; title: string; tag: string; seconds: number; ratio: string; seed: number };
export type Catalog = { brand: string; provider: string; models: Model[]; tools: Tool[]; studios: Studio[]; references: Reference[] };
export type User = { id: string; email: string; name: string };
export type Output = { type: "image" | "video"; url: string; mock?: boolean };
export type Job = { id: string; kind: string; spec: string; status: "queued" | "running" | "done" | "failed"; createdAt: number; input: { prompt: string; ratio: string; seconds: number; studio: string | null; characterName?: string }; outputs: Output[]; error: string | null };
export type Character = { id: string; number: string; name: string; description: string; images: string[]; locked: boolean };

const KEY = "ristretto.token";
export const getToken = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const setToken = (t: string | null) => { try { t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY); } catch { /* storage unavailable */ } };

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const t = getToken();
  if (t) headers.Authorization = `Bearer ${t}`;
  if (opts.body) headers["Content-Type"] = "application/json";
  const res = await fetch(path, { method: opts.method || (opts.body || opts.form ? "POST" : "GET"), headers, body: opts.form ?? (opts.body ? JSON.stringify(opts.body) : undefined) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}

export const placeholder = (seed: string | number, ratio = "1:1", label = "") => `/api/placeholder/${seed}.svg?ratio=${encodeURIComponent(ratio)}${label ? `&label=${encodeURIComponent(label)}` : ""}`;

export async function uploadFile(file: File): Promise<string> {
  const f = new FormData();
  f.append("file", file);
  const r = await api<{ url: string }>("/api/upload", { form: f });
  return r.url;
}

/* ---------- catalog ---------- */
const CatalogCtx = createContext<Catalog | null>(null);
export function CatalogProvider({ children }: { children: ReactNode }) {
  const [c, setC] = useState<Catalog | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => { api<Catalog>("/api/catalog").then(setC).catch((e) => setErr(e.message)); }, []);
  if (err) return <div className="wrap" style={{ padding: 60 }}><p className="err">Could not reach the server: {err}</p></div>;
  if (!c) return <div className="wrap" style={{ padding: 60 }}><div className="spinner" /></div>;
  return <CatalogCtx.Provider value={c}>{children}</CatalogCtx.Provider>;
}
export const useCatalog = () => { const c = useContext(CatalogCtx); if (!c) throw new Error("catalog"); return c; };

/* ---------- auth ---------- */
type AuthState = { user: User | null; ready: boolean; login: (e: string, p: string) => Promise<void>; setup: (e: string, p: string, n?: string) => Promise<void>; logout: () => void; setUser: (u: User) => void };
const AuthCtx = createContext<AuthState | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!getToken()) { setReady(true); return; }
    api<{ user: User }>("/api/me").then((r) => setUser(r.user)).catch(() => setToken(null)).finally(() => setReady(true));
  }, []);
  const take = (r: { token: string; user: User }) => { setToken(r.token); setUser(r.user); };
  const value: AuthState = {
    user, ready, setUser,
    login: async (email, password) => take(await api("/api/auth/login", { body: { email, password } })),
    setup: async (email, password, name) => take(await api("/api/auth/setup", { body: { email, password, name } })),
    logout: () => { setToken(null); setUser(null); },
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
export const useAuth = () => { const a = useContext(AuthCtx); if (!a) throw new Error("auth"); return a; };

/* ---------- job runner ---------- */
export async function submitJob(body: Record<string, unknown>): Promise<Job> {
  const r = await api<{ job: Job }>("/api/generate", { body });
  return r.job;
}
export async function waitForJob(id: string, onTick?: (j: Job) => void): Promise<Job> {
  for (let i = 0; i < 400; i++) {
    const r = await api<{ job: Job }>(`/api/jobs/${id}`);
    onTick?.(r.job);
    if (r.job.status === "done" || r.job.status === "failed") return r.job;
    await new Promise((res) => setTimeout(res, 1500));
  }
  throw new Error("Timed out waiting for the job");
}
