import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { supabase } from "@/src/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";

type TaskStatus = "completed" | "in_progress" | "on_hold" | "blocked";

interface Task {
  id: string;
  task_id: string;
  description: string;
  owner: string;
  department: string;
  start_date: string;
  estimated_completion_date: string;
  actual_completion_date: string;
  status: TaskStatus;
  pending_changes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export default function TaskTrackerScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<Partial<Task>>({});
  const [currentUser, setCurrentUser] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Fetch current user from stored profile
  useEffect(() => {
    async function loadUser() {
      const profile = await AsyncStorage.getItem("profile");
      if (profile) {
        const parsed = JSON.parse(profile);
        setCurrentUser(parsed.username);
      }
    }
    loadUser();
  }, []);

  // Load tasks
  useEffect(() => {
    if (currentUser) fetchTasks();
  }, [currentUser]);

  const fetchTasks = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("task_overviews")
      .select("*")
      .eq("owner", currentUser)
      .order("created_at", { ascending: false });

    if (error) {
      Alert.alert("Error", "Failed to load tasks");
      console.log(error);
      setLoading(false);
      return;
    }

    const formatted = data.map((t) => ({
      ...t,
      start_date: t.start_date ?? "",
      estimated_completion_date: t.estimated_completion_date ?? "",
      actual_completion_date: t.actual_completion_date ?? "",
    }));

    setTasks(formatted as Task[]);
    setLoading(false);
  };

  const startEditing = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingValues({
      description: task.description,
      estimated_completion_date: task.estimated_completion_date,
      actual_completion_date: task.actual_completion_date,
      status: task.status,
      task_id: task.task_id,
    });
  };

  const cancelEditing = () => {
    setEditingTaskId(null);
    setEditingValues({});
  };

  const saveEdit = async () => {
    if (!editingTaskId) return;

    const { error } = await supabase
      .from("task_overviews")
      .update({
        pending_changes: JSON.stringify({
          ...editingValues,
          changed_by: currentUser,
          change_requested_at: new Date().toISOString(),
        }),
      })
      .eq("id", editingTaskId);

    if (error) {
      Alert.alert("Error", "Failed to submit changes");
      return;
    }

    Alert.alert("Success", "Changes submitted for manager approval");

    cancelEditing();
    fetchTasks();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>My Tasks</Text>

      {tasks.length === 0 && (
        <Text style={styles.noTasks}>No tasks assigned yet.</Text>
      )}

      {tasks.map((task) => {
        const isEditing = editingTaskId === task.id;
        return (
          <View key={task.id} style={styles.card}>
            {/* TASK ID */}
            <Text style={styles.label}>Task ID</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={editingValues.task_id ?? task.task_id}
              editable={false}
            />

            {/* DESCRIPTION */}
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={styles.input}
              multiline
              value={isEditing ? editingValues.description ?? "" : task.description}
              onChangeText={(t) =>
                setEditingValues({
                  ...editingValues,
                  description: t ?? "",
                })
              }
              editable={isEditing}
            />

            {/* DATES */}
            <Text style={styles.label}>Estimated Completion</Text>
            <TextInput
              style={styles.input}
              value={
                isEditing
                  ? editingValues.estimated_completion_date ?? ""
                  : task.estimated_completion_date
              }
              onChangeText={(t) =>
                setEditingValues({
                  ...editingValues,
                  estimated_completion_date: t ?? "",
                })
              }
              editable={isEditing}
              placeholder="YYYY-MM-DD"
            />

            <Text style={styles.label}>Actual Completion</Text>
            <TextInput
              style={styles.input}
              value={
                isEditing
                  ? editingValues.actual_completion_date ?? ""
                  : task.actual_completion_date
              }
              onChangeText={(t) =>
                setEditingValues({
                  ...editingValues,
                  actual_completion_date: t ?? "",
                })
              }
              editable={isEditing}
              placeholder="YYYY-MM-DD"
            />

            {/* STATUS */}
            <Text style={styles.label}>Status</Text>
            {isEditing ? (
              <Picker
                selectedValue={editingValues.status ?? task.status}
                onValueChange={(v) =>
                  setEditingValues({ ...editingValues, status: v })
                }
              >
                <Picker.Item label="In Progress" value="in_progress" />
                <Picker.Item label="Completed" value="completed" />
                <Picker.Item label="On Hold" value="on_hold" />
                <Picker.Item label="Blocked" value="blocked" />
              </Picker>
            ) : (
              <Text style={styles.status}>{task.status}</Text>
            )}

            {/* ACTION BUTTONS */}
            {isEditing ? (
              <View style={styles.row}>
                <TouchableOpacity style={styles.saveBtn} onPress={saveEdit}>
                  <Text style={styles.btnText}>Submit</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelBtn} onPress={cancelEditing}>
                  <Text style={styles.btnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => startEditing(task)}
                disabled={!!task.pending_changes}
              >
                <Text style={styles.btnText}>
                  {task.pending_changes ? "Pending..." : "Edit"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 26, fontWeight: "bold", marginBottom: 16 },
  noTasks: { fontSize: 16, color: "#777", marginTop: 20 },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 3,
  },
  label: { marginTop: 12, fontWeight: "600", marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
  },
  disabledInput: { backgroundColor: "#f0f0f0" },
  status: {
    padding: 8,
    backgroundColor: "#ddd",
    borderRadius: 6,
    marginTop: 4,
  },
  editBtn: {
    marginTop: 14,
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 8,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: "green",
    padding: 12,
    borderRadius: 8,
    marginRight: 6,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "red",
    padding: 12,
    borderRadius: 8,
    marginLeft: 6,
  },
  btnText: { color: "white", textAlign: "center", fontWeight: "600" },
  row: { flexDirection: "row", marginTop: 12 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
