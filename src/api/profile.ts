import Constants from "expo-constants";

const API_BASE = Constants.expoConfig?.extra?.apiBaseUrl

export async function fetchProfile(token: string) {
  const res = await fetch(`${API_BASE}/api/user/profile`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const json = await res.json()

  if (!res.ok) {
    throw new Error(json.error || "Failed to load profile")
  }

  return json.profile;
}
