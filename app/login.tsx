// app/login.tsx (or app/login/index.tsx depending on your structure)
import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { loginEmployee } from "../src/api/auth";
import { LoadingOverlay } from "../src/components/loadingOverlay";

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    try {
      if (!email || !password) {
        Alert.alert("Missing fields", "Please enter both email and password.");
        return;
      }

      setLoading(true);

      const result = await loginEmployee(email, password);
      // result = { user, session } from Supabase

      // Wait for Supabase session to persist on device
      await new Promise((res) => setTimeout(res, 300));

      // Navigate to correct tab route and pass email if you want to show it
      router.replace({
        pathname: "/(tabs)/home",
        params: { email: result.user.email },
      });
    } catch (err: any) {
      Alert.alert("Login Failed", err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {loading && <LoadingOverlay />}

      <Text style={styles.title}>OpsClad Login</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setEmail}
        value={email}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        onChangeText={setPassword}
        value={password}
      />

      <Button
        title={loading ? "Logging in..." : "Login"}
        onPress={handleLogin}
        disabled={loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 100, padding: 24 },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 40,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 14,
    borderRadius: 8,
    marginBottom: 15,
  },
});
