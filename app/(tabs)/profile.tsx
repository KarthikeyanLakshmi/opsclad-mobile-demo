import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { supabase } from "@/src/lib/supabase";

export default function ProfileScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile() {
    try {
      setLoading(true);

      // 1️⃣ Get current user from Supabase Auth
      const { data: authData, error: authErr } = await supabase.auth.getUser();

      if (authErr || !authData?.user) {
        setLoading(false);
        return;
      }

      const userId = authData.user.id;

      // 2️⃣ Fetch profile (from profiles table)
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      // 3️⃣ Fetch user role
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      if (profileData) setProfile(profileData);
      if (roleData) setRole(roleData.role);
    } catch (err) {
      console.log("Profile load error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text>No profile found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Profile</Text>

      <Text style={styles.label}>Name: <Text style={styles.value}>{profile.username}</Text></Text>
      <Text style={styles.label}>Email: <Text style={styles.value}>{profile.email}</Text></Text>
      <Text style={styles.label}>Employee ID: <Text style={styles.value}>{profile.employee_id}</Text></Text>

      <Text style={styles.label}>
        Birthday: <Text style={styles.value}>{profile.birthday || "Not provided"}</Text>
      </Text>

      <Text style={styles.label}>
        Role: <Text style={styles.value}>{role}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 80 },
  header: { fontSize: 28, fontWeight: "bold", marginBottom: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  label: {
    fontSize: 18,
    marginBottom: 10,
    fontWeight: "600",
  },

  value: {
    fontWeight: "400",
    color: "#333",
  },
});
