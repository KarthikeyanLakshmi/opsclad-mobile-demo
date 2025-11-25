import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchProfile } from "../../src/api/profile";

export default function ProfileScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile() {
    try {
      const token = await AsyncStorage.getItem("session_token");

      if (!token) {
        setLoading(false);
        return;
      }

      const data = await fetchProfile(token);
      setProfile(data);
    } catch (err: any) {
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

      <Text>Name: {profile.name}</Text>
      <Text>Email: {profile.email}</Text>
      <Text>Employee ID: {profile.employee_id}</Text>
      <Text>Birthday: {profile.birthday}</Text>
      <Text>Role: {profile.role}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 80 },
  header: { fontSize: 28, fontWeight: "bold", marginBottom: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
