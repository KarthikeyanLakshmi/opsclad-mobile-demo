import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { format } from "date-fns";

interface PTORecord {
  id: string;
  date: string;
  day: string;
  hours: number;
  employee_name: string;
  employee_id: string;
  sender_email: string;
  updated_at: string;
  is_pto: boolean;
  status: "pending" | "approved" | "rejected";
}

interface Employee {
  id: string;
  name: string;
  birthday: string | null;
}

interface HolidayRecord {
  id: string;
  holiday: string;
  holiday_date: string;
  holiday_description: string | null;
}

interface SelectedDateInfo {
  date: Date;
  ptoRecords: PTORecord[];
  birthdays: Employee[];
  holidays: HolidayRecord[];
}

export default function DateDetailsModal({
  selectedDate,
  onClose,
}: {
  selectedDate: SelectedDateInfo | null;
  onClose: () => void;
}) {
  if (!selectedDate) return null;

  return (
    <Modal animationType="slide" transparent visible>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.headerText}>
              {format(selectedDate.date, "MMMM dd, yyyy")}
            </Text>

            <TouchableOpacity onPress={onClose}>
              <Text style={styles.close}>✖</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>

            {/* Birthdays */}
            {selectedDate.birthdays.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: "#FFD54F" }]}>
                  🎉 Birthdays ({selectedDate.birthdays.length})
                </Text>

                {selectedDate.birthdays.map((emp) => (
                  <View key={emp.id} style={[styles.itemBox, styles.yellowBox]}>
                    <Text style={styles.itemName}>{emp.name}</Text>
                    <Text style={styles.subText}>Happy Birthday! 🎊</Text>
                  </View>
                ))}
              </View>
            )}

            {/* PTO */}
            {selectedDate.ptoRecords.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: "#81C784" }]}>
                  👥 Employees on Leave ({selectedDate.ptoRecords.length})
                </Text>

                {selectedDate.ptoRecords.map((rec) => (
                  <View key={rec.id} style={[styles.itemBox, styles.greenBox]}>
                    <Text style={styles.itemName}>{rec.employee_name}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Holidays */}
            {selectedDate.holidays.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: "#FFB74D" }]}>
                  🎌 Public Holidays ({selectedDate.holidays.length})
                </Text>

                {selectedDate.holidays.map((hol) => (
                  <View key={hol.id} style={[styles.itemBox, styles.orangeBox]}>
                    <Text style={styles.itemName}>{hol.holiday}</Text>
                    <Text style={styles.subText}>Public Holiday 🎉</Text>
                  </View>
                ))}
              </View>
            )}

            {/* No Activity */}
            {selectedDate.birthdays.length === 0 &&
              selectedDate.ptoRecords.length === 0 &&
              selectedDate.holidays.length === 0 && (
                <View style={styles.noActivityBox}>
                  <Text style={{ color: "#aaa", fontSize: 16 }}>
                    No activity for this date
                  </Text>
                </View>
              )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#1E1E1E",
    borderRadius: 14,
    paddingBottom: 20,
    maxHeight: "85%",
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerText: { fontSize: 20, color: "#fff" },
  close: { fontSize: 20, color: "#ccc" },
  content: { padding: 20 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 10,
  },
  itemBox: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  yellowBox: { backgroundColor: "rgba(255,214,79,0.2)" },
  greenBox: { backgroundColor: "rgba(129,199,132,0.2)" },
  orangeBox: { backgroundColor: "rgba(255,183,77,0.2)" },
  itemName: { color: "#fff", fontSize: 16 },
  subText: { color: "#ccc" },
  noActivityBox: {
    padding: 30,
    alignItems: "center",
  },
});
