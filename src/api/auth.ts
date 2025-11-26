import { supabase } from "../lib/supabase";

export async function loginEmployee(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw new Error(error.message);

  // Ensure session persists in RN
  if (data.session) {
    await supabase.auth.setSession(data.session);
  }

  return data;
}

export async function logoutEmployee() {
  await supabase.auth.signOut();
}
