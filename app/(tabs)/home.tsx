import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { logoutEmployee } from "../../src/api/logout";
import { LoadingOverlay } from "../../src/components/loadingOverlay";
import { Calendar } from "react-native-calendars";
import DateDetailsModal from "../../components/dashboard/DateDetailsModal";
import { supabase } from "../../src/lib/supabase";


import {
  PTORecord,
  Employee,
  HolidayRecord,
  SelectedDateInfo,
} from "../../src/types/calendar";

// Normalize ANY date format
function normalizeDate(date: string | null): string | null {
  if (!date) return null;

  // ISO format
  if (date.includes("T")) return date.split("T")[0];

  // DD/MM/YYYY
  if (date.includes("/")) {
    const [day, month, year] = date.split("/");
    return `${year}-${month}-${day}`;
  }

  return date;
}

export default function HomeScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams();

  const [loading, setLoading] = useState(false);
  const [markedDates, setMarkedDates] = useState({});
  const [selectedInfo, setSelectedInfo] = useState<SelectedDateInfo | null>(null);

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

  const [ptoRecords, setPtoRecords] = useState<PTORecord[]>([]);
  const [birthdays, setBirthdays] = useState<Employee[]>([]);
  const [holidays, setHolidays] = useState<HolidayRecord[]>([]);

  // Load all data
  async function loadCalendarData() {
    setLoading(true);

    try {
      const { data: ptoData } = await supabase.from("pto_records").select("*");
      setPtoRecords(ptoData || []);

      const { data: empData } = await supabase
        .from("employees")
        .select("id, name, birthday");
      setBirthdays(empData || []);

      const { data: holData } = await supabase.from("holidays").select("*");
      setHolidays(holData || []);

    } catch (err: any) {
      Alert.alert("Error loading data", err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCalendarData();
  }, []);

  // Build markers
  useEffect(() => {
    const marks: any = {};

    // PTO
    ptoRecords.forEach((p) => {
      if (!marks[p.date]) marks[p.date] = { dots: [] };
      marks[p.date].dots.push({ color: "green" });
    });

    // Birthdays
    birthdays.forEach((b) => {
      const cleanDate = normalizeDate(b.birthday);
      if (!cleanDate) return;

      if (!marks[cleanDate]) marks[cleanDate] = { dots: [] };
      marks[cleanDate].dots.push({ color: "yellow" });
    });

    // Holidays
    holidays.forEach((h) => {
      if (!marks[h.holiday_date]) marks[h.holiday_date] = { dots: [] };
      marks[h.holiday_date].dots.push({ color: "orange" });
    });

    setMarkedDates(marks);
  }, [ptoRecords, birthdays, holidays]);

  // On day press
  const handleDayPress = (day: any) => {
    const date = day.dateString;

    const selected: SelectedDateInfo = {
      date: new Date(date),
      ptoRecords: ptoRecords.filter((p) => p.date === date),
      birthdays: birthdays.filter(
        (b) => normalizeDate(b.birthday) === date
      ),
      holidays: holidays.filter((h) => h.holiday_date === date),
    };

    setSelectedInfo(selected);
  };

  return (
    <View style={styles.container}>
      {loading && <LoadingOverlay />}

      <Text style={styles.welcome}>Home</Text>
      <Text style={styles.email}>{email}</Text>

      <Text style={styles.headerTitle}>Calendar</Text>

      <Calendar
        markingType="multi-dot"
        markedDates={markedDates}
        onDayPress={handleDayPress}
        style={styles.calendar}
        theme={{
          todayTextColor: "#FF5722",
          arrowColor: "#000",
        }}
      />

      <DateDetailsModal
        selectedDate={selectedInfo}
        onClose={() => setSelectedInfo(null)}
      />

      {/* 🔴 Custom Red Logout Button */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 70,
    paddingHorizontal: 20,
    flex: 1,
    backgroundColor: "#fff",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "600",
    marginBottom: 15,
  },
  calendar: {
    borderRadius: 10,
    elevation: 3,
    marginBottom: 20,
  },
  welcome: {
    fontSize: 24,
    fontWeight: "600",
    marginTop: 20,
  },
  email: {
    fontSize: 18,
    marginTop: 5,
    marginBottom: 30,
    color: "#555",
  },
  logoutBtn: {
    backgroundColor: "#8B0000",
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    alignItems: "center",
  },
  logoutText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});
