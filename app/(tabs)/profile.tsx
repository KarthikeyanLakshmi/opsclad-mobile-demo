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

      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return;

      const userId = authData.user.id;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      const { data: roleData } = await supabase
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
        <ActivityIndicator size="large" color="#1D4ED8" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 18 }}>No profile found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Name as the PAGE HEADER */}
      <Text style={styles.nameHeader}>{profile.username}</Text>

      {/* Card */}
      <View style={styles.card}>
        <Text style={styles.label}>
          Email: <Text style={styles.value}>{profile.email}</Text>
        </Text>

        <Text style={styles.label}>
          Employee ID: <Text style={styles.value}>{profile.employee_id}</Text>
        </Text>

        <Text style={styles.label}>
          Birthday:{" "}
          <Text style={styles.value}>
            {profile.birthday || "Not provided"}
          </Text>
        </Text>

        <Text style={styles.label}>
          Role: <Text style={styles.value}>{role}</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 25,
    paddingTop: 70,
    backgroundColor: "#F3F4F6",
    flex: 1,
  },

  nameHeader: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 25,
    textAlign: "center",
  },

  card: {
    backgroundColor: "#FFFFFF",
    padding: 25,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },

  label: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 12,
    color: "#374151",
  },

  value: {
    fontWeight: "400",
    color: "#1F2937",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
