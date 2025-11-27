import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert, StyleSheet, Image } from "react-native";
import { useRouter } from "expo-router";
import { loginEmployee } from "../src/api/auth";
import { LoadingOverlay } from "../src/components/loadingOverlay";

const logo = require("../assets/images/opsclad-logo.png");

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

      await new Promise((res) => setTimeout(res, 300));

      router.replace("/(tabs)/home");
    } catch (err: any) {
      Alert.alert("Login Failed", err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {loading && <LoadingOverlay />}

      {/* Logo */}
      <Image source={logo} style={styles.logo} resizeMode="contain" />
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#cccccc"
        keyboardType="email-address"
        autoCapitalize="none"
        onChangeText={setEmail}
        value={email}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#cccccc"
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
  container: { 
    flex: 1,
    backgroundColor: "#0A1A4F", // dark blue
    padding: 24,
    justifyContent: "center"
  },

  logo: {
    width: "70%",
    height: 120,
    alignSelf: "center",
    marginBottom: 20,
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 40,
    color: "white",
  },

  input: {
    borderWidth: 1,
    borderColor: "white",
    padding: 14,
    borderRadius: 8,
    marginBottom: 15,
    color: "white",
  },
});
