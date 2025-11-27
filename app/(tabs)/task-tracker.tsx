import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
  StyleSheet,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { supabase } from "@/src/lib/supabase";

// ----------------------
// Status Options
// ----------------------
const TASK_STATUS_OPTIONS = [
  { value: "completed", label: "Completed" },
  { value: "in_progress", label: "In Progress" },
  { value: "on_hold", label: "On Hold" },
  { value: "blocked", label: "Blocked" },
];

// ----------------------
// Badge Colors
// ----------------------
const getStatusBadgeStyle = (status: string) => {
  switch (status) {
    case "completed":
      return { backgroundColor: "#7ba48b", color: "white" }; // green
    case "in_progress":
      return { backgroundColor: "#95bdff", color: "white" }; // blue
    case "on_hold":
      return { backgroundColor: "#f0ad4e", color: "white" }; // yellow
    case "blocked":
      return { backgroundColor: "#d9534f", color: "white" }; // red
    default:
      return { backgroundColor: "#ccc", color: "black" };
  }
};

// ----------------------
// Task Type
// ----------------------
export interface Task {
  id: string;
  task_id: string;
  description: string;
  owner: string;
  department: string;
  start_date?: string;
  estimated_completion_date?: string;
  actual_completion_date?: string;
  status: string;
  pending_changes?: any;
  created_at?: string;
  updated_at?: string;
}

export default function MyTasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Task>>({});

  // TODO: Replace with actual logged-in name
  const currentUser = "Karthikeyan Lakshmi";

  // ----------------------
  // Fetch Tasks
  // ----------------------
  const fetchTasks = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("task_overviews")
      .select("*")
      .eq("owner", currentUser)
      .order("created_at", { ascending: false });

    if (error) {
      Alert.alert("Error", error.message);
      setLoading(false);
      return;
    }

    const formatted = (data ?? []).map((t: any) => ({
      ...t,
      start_date: t.start_date?.split("T")[0] ?? "",
      estimated_completion_date:
        t.estimated_completion_date?.split("T")[0] ?? "",
      actual_completion_date: t.actual_completion_date?.split("T")[0] ?? "",
    }));

    setTasks(formatted);
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // ----------------------
  // Editing
  // ----------------------
  const startEdit = (task: Task) => {
    setEditingId(task.id);
    setEditValues({
      description: task.description,
      estimated_completion_date: task.estimated_completion_date,
      actual_completion_date: task.actual_completion_date,
      status: task.status,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  const saveEdit = async () => {
    if (!editingId) return;

    const { error } = await supabase
      .from("task_overviews")
      .update({
        pending_changes: JSON.stringify({
          ...editValues,
          changed_by: currentUser,
          change_requested_at: new Date().toISOString(),
        }),
      })
      .eq("id", editingId);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    Alert.alert("Success", "Changes submitted for approval!");
    fetchTasks();
    cancelEdit();
  };

  // ----------------------
  // Render Each Task
  // ----------------------
  const renderItem = ({ item }: { item: Task }) => {
    const isEditing = editingId === item.id;

    return (
      <View style={styles.card}>
        <Text style={styles.title}>Task: {item.task_id}</Text>

        {isEditing ? (
          <>
            {/* DESCRIPTION */}
            <TextInput
              style={styles.input}
              value={editValues.description}
              onChangeText={(t) =>
                setEditValues({ ...editValues, description: t })
              }
              placeholder="Description"
            />

            {/* EST COMPLETION */}
            <TextInput
              style={styles.input}
              value={editValues.estimated_completion_date}
              onChangeText={(t) =>
                setEditValues({
                  ...editValues,
                  estimated_completion_date: t,
                })
              }
              placeholder="Estimated Completion (YYYY-MM-DD)"
            />

            {/* ACTUAL COMPLETION */}
            <TextInput
              style={styles.input}
              value={editValues.actual_completion_date}
              onChangeText={(t) =>
                setEditValues({
                  ...editValues,
                  actual_completion_date: t,
                })
              }
              placeholder="Actual Completion (YYYY-MM-DD)"
            />

            {/* STATUS DROPDOWN */}
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={editValues.status}
                onValueChange={(value) =>
                  setEditValues({ ...editValues, status: value })
                }
              >
                {TASK_STATUS_OPTIONS.map((opt) => (
                  <Picker.Item
                    key={opt.value}
                    label={opt.label}
                    value={opt.value}
                  />
                ))}
              </Picker>
            </View>

            {/* BUTTONS */}
            <View style={styles.row}>
              <TouchableOpacity style={styles.saveBtn} onPress={saveEdit}>
                <Text style={styles.btnText}>Save</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelBtn} onPress={cancelEdit}>
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text>Description: {item.description}</Text>
            <Text>Dept: {item.department}</Text>
            <Text>Start: {item.start_date}</Text>
            <Text>Est: {item.estimated_completion_date}</Text>
            <Text>Actual: {item.actual_completion_date || "N/A"}</Text>

            {/* STATUS BADGE */}
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: getStatusBadgeStyle(item.status).backgroundColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: getStatusBadgeStyle(item.status).color },
                ]}
              >
                {
                  TASK_STATUS_OPTIONS.find((s) => s.value === item.status)
                    ?.label
                }
              </Text>
            </View>

            {/* PENDING */}
            {item.pending_changes && (
              <Text style={{ color: "orange", marginTop: 4 }}>
                Pending Approval
              </Text>
            )}

            {/* EDIT BUTTON */}
            <TouchableOpacity
              style={[
                styles.editBtn,
                item.pending_changes && { backgroundColor: "#aaa" },
              ]}
              disabled={!!item.pending_changes}
              onPress={() => startEdit(item)}
            >
              <Text style={styles.btnText}>
                {item.pending_changes ? "Pending" : "Edit"}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };

  // ----------------------
  // Loading UI
  // ----------------------
  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );

  // ----------------------
  // Output
  // ----------------------
  return (
    <View style={{ padding: 16 }}>
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 30 }}>
            No tasks found.
          </Text>
        }
      />
    </View>
  );
}

// ----------------------
// Styles
// ----------------------
const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    elevation: 2,
  },
  title: { fontWeight: "bold", fontSize: 16, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    marginBottom: 10,
  },
  editBtn: {
    backgroundColor: "#ff5252",
    padding: 10,
    borderRadius: 6,
    marginTop: 10,
  },
  saveBtn: {
    backgroundColor: "green",
    padding: 10,
    borderRadius: 6,
    flex: 1,
    marginRight: 5,
  },
  cancelBtn: {
    backgroundColor: "gray",
    padding: 10,
    borderRadius: 6,
    flex: 1,
    marginLeft: 5,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  btnText: { color: "white", textAlign: "center" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  row: { flexDirection: "row", marginTop: 10 },
});
