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
      setLoading(true);   // start loading
      
      const result = await loginEmployee(email, password);

      router.replace({
        pathname: "/home",
        params: { email: result.user.email },
      });
    } catch (err: any) {
      Alert.alert("Login Failed", err.message);
    } finally {
      setLoading(false); // stop loading
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
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        onChangeText={setPassword}
      />

      <Button title={loading ? "Logging in..." : "Login"} onPress={handleLogin} disabled={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 100, padding: 24 },
  title: { fontSize: 28, fontWeight: "bold", textAlign: "center", marginBottom: 40 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 14,
    borderRadius: 8,
    marginBottom: 15,
  },
});
