import { supabase } from "../lib/supabase";

export async function logoutEmployee() {
  // clear supabase session
  await supabase.auth.signOut();
}