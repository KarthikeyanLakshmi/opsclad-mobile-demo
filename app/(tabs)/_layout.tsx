import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from "react-native";
import { supabase } from "@/src/lib/supabase";

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function TabsLayout() {
  const router = useRouter();

  const [drawerVisible, setDrawerVisible] = useState(false);
  const drawerAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // -------------------------
  // LOAD PROFILE FROM SUPABASE
  // -------------------------
  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);

    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const userId = authData.user.id;

    const { data: profileData } = await supabase
      .from("profiles")
      .select("username, email, employee_id")
      .eq("id", userId)
      .single();

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (profileData && roleData) {
      setProfile({
        username: profileData.username,
        role: roleData.role,
      });
    }

    setLoading(false);
  }

  // DRAWER ANIMATION
  const openDrawer = () => {
    setDrawerVisible(true);
    Animated.timing(drawerAnim, {
      toValue: 0,
      duration: 250,
      easing: undefined,
      useNativeDriver: false,
    }).start();
  };

  const closeDrawer = () => {
    Animated.timing(drawerAnim, {
      toValue: SCREEN_WIDTH,
      duration: 250,
      easing: undefined,
      useNativeDriver: false, 
    }).start(() => setDrawerVisible(false));
  };

  return (
    <View style={{ flex: 1 }}>
      {drawerVisible && (
        <TouchableOpacity style={styles.overlay} onPress={closeDrawer} />
      )}

      <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerAnim }] }]}>
        {/* Header */}
        <View style={styles.drawerHeader}>
          <Text style={styles.drawerHeaderText}>Menu</Text>
          <TouchableOpacity onPress={closeDrawer}>
            <Ionicons name="close" size={30} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Profile */}
        <View style={styles.drawerProfile}>
          <Text style={styles.profileName}>
            {profile?.username ?? "User"}
          </Text>
          <Text style={styles.profileRole}>
            {profile?.role ?? "Role"}
          </Text>
        </View>

        {/* Menu Links */}
        <TouchableOpacity
          style={styles.drawerItem}
          onPress={() => {
            closeDrawer();
            router.push("/timesheet-tracker");
          }}
        >
          <Text style={styles.drawerItemText}>Timesheet Tracker</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.drawerItem}
          onPress={() => {
            closeDrawer();
            router.push("/skills-tracker");
          }}
        >
          <Text style={styles.drawerItemText}>Skills Tracker</Text>
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={async () => {
            closeDrawer();
            await supabase.auth.signOut();
            router.replace("/login");
          }}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* MAIN TABS */}
      <Tabs
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: "#0A1A4F" },
          headerTitleStyle: { color: "#fff" },

          // TOP LEFT — USERNAME + ROLE
          headerTitle: () => (
            <View>
              {loading ? (
                <Text style={{ color: "#fff" }}>Loading...</Text>
              ) : profile ? (
                <>
                  <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>
                    {profile.username}
                  </Text>
                  <Text style={{ color: "#cbd5e1", fontSize: 12 }}>
                    {profile.role}
                  </Text>
                </>
              ) : (
                <Text style={{ color: "#fff" }}>No Profile</Text>
              )}
            </View>
          ),

          // TOP RIGHT — BURGER BUTTON
          headerRight: () => (
            <TouchableOpacity
              onPress={openDrawer}
              style={{ padding: 12 }} // BIGGER TOUCH AREA
            >
              <Ionicons name="menu" size={28} color="#fff" />
            </TouchableOpacity>
          ),

          tabBarActiveTintColor: "#0A1A4F",
          tabBarInactiveTintColor: "#8e8e8e",
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            tabBarLabel: "",
            tabBarIcon: ({ color }) => (
              <Ionicons name="home-outline" size={24} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="task-tracker"
          options={{
            tabBarLabel: "",
            tabBarIcon: ({ color }) => (
              <Ionicons name="list-outline" size={24} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="leave-tracker"
          options={{
            tabBarLabel: "",
            tabBarIcon: ({ color }) => (
              <Ionicons name="calendar-outline" size={24} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            tabBarLabel: "",
            tabBarIcon: ({ color }) => (
              <Ionicons name="person-outline" size={24} color={color} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.4)",
    zIndex: 10,
  },
  drawer: {
    position: "absolute",
    right: 0,
    top: 0,
    height: "100%",
    width: SCREEN_WIDTH * 0.75,
    backgroundColor: "#0A1A4F", // dark navy
    zIndex: 20,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  drawerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
  },
  drawerHeaderText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },
  drawerProfile: {
    marginBottom: 40,
  },
  profileName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  profileRole: {
    color: "#cbd5e1",
    fontSize: 14,
    marginTop: 4,
  },
  drawerItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#12326B",
  },
  drawerItemText: {
    color: "#fff",
    fontSize: 16,
  },
  logoutBtn: {
    marginTop: 40,
    backgroundColor: "#B30000",
    paddingVertical: 14,
    borderRadius: 8,
  },
  logoutText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
  },
});
