import React, { useState } from "react";
import { View, Text, StyleSheet, Button, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { logoutEmployee } from "../src/api/logout";
import { LoadingOverlay } from "../src/components/loadingOverlay";

export default function HomeScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    try {
      setLoading(true);

      await logoutEmployee();

      router.replace("/login");
    } catch (err: any) {
      Alert.alert("Logout Failed", err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {loading && <LoadingOverlay />}

      <Text style={styles.title}>Welcome 👋</Text>
      <Text style={styles.email}>{email}</Text>

      <View style={styles.logoutButton}>
        <Button title="Logout" color="#d9534f" onPress={handleLogout} disabled={loading} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 100, padding: 24 },
  title: { fontSize: 32, fontWeight: "bold" },
  email: { fontSize: 20, marginTop: 10, marginBottom: 40 },
  logoutButton: {
    marginTop: 40,
    borderRadius: 10,
    overflow: "hidden",
  },
});
