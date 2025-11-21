import Constants from "expo-constants";

const API_BASE = Constants.expoConfig?.extra?.apiBaseUrl;

export async function loginEmployee(email: string, password: string) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message);
  }

  return json;
}