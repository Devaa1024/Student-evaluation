import { createClient } from "@supabase/supabase-js";
import { workspaceSchema } from "./model.js";
const url = import.meta.env.VITE_SUPABASE_URL,
  key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabase =
  url && key
    ? createClient(url, key, {
        auth: {
          flowType: "pkce",
          detectSessionInUrl: true,
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : null;
export async function signIn() {
  if (!supabase)
    throw new Error(
      "School sign-in is not configured yet. Please contact the school administrator.",
    );
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: location.origin + location.pathname,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error) throw error;
}
export async function loadWorkspaces() {
  const { data, error } = await supabase
    .from("ci_workspaces")
    .select("*")
    .order("created_at");
  if (error) throw error;
  return data.map((r) => ({ ...r, payload: workspaceSchema.parse(r.payload) }));
}
export async function createWorkspace(userId, payload) {
  workspaceSchema.parse(payload);
  const { data, error } = await supabase
    .from("ci_workspaces")
    .insert({ owner_id: userId, payload })
    .select()
    .single();
  if (error) throw error;
  return data;
}
export async function saveWorkspace(row, payload) {
  workspaceSchema.parse(payload);
  const { data, error } = await supabase
    .from("ci_workspaces")
    .update({ payload, revision: row.revision + 1 })
    .eq("id", row.id)
    .eq("revision", row.revision)
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data)
    throw new Error(
      "Someone changed this workspace or your access changed. Export your draft, then reload before editing.",
    );
  return data;
}
export async function publishShare(workspaceId, payload, email = "") {
  const expires = new Date(Date.now() + 7 * 86400000).toISOString();
  const { data, error } = await supabase
    .from("ci_shares")
    .insert({
      workspace_id: workspaceId,
      kind: payload.kind,
      payload,
      parent_email: email.toLowerCase().trim() || null,
      expires_at: expires,
    })
    .select("id,expires_at")
    .single();
  if (error) throw error;
  return { ...data, url: location.origin + "/share/" + data.id };
}
export async function readShare(token) {
  if (!supabase) throw new Error("This school has not configured sharing.");
  const { data, error } = await supabase.rpc("ci_read_share", { token });
  if (error) throw error;
  if (!data)
    throw new Error(
      "This link expired, was revoked, or is not available to your Google account.",
    );
  return data;
}
export async function listShares(workspaceId) {
  const { data, error } = await supabase
    .from("ci_shares")
    .select("id,kind,expires_at,parent_email")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}
export async function revokeShare(shareId) {
  const { error } = await supabase.from("ci_shares").delete().eq("id", shareId);
  if (error) throw error;
}
