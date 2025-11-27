import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
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

function formatPrettyDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString();
  } catch {
    return dateStr;
  }
}

type EventType = "PTO" | "Birthday" | "Holiday";

interface MonthEvent {
  id: string;
  date: string; // YYYY-MM-DD
  type: EventType;
  title: string;
  description?: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [markedDates, setMarkedDates] = useState<any>({});
  const [selectedInfo, setSelectedInfo] = useState<SelectedDateInfo | null>(
    null
  );

  const [ptoRecords, setPtoRecords] = useState<PTORecord[]>([]);
  const [birthdays, setBirthdays] = useState<Employee[]>([]);
  const [holidays, setHolidays] = useState<HolidayRecord[]>([]);

  // Track currently visible month (YYYY-MM)
  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    const today = new Date();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    return `${today.getFullYear()}-${m}`;
  });

  // Derived events for the current month
  const [monthEvents, setMonthEvents] = useState<MonthEvent[]>([]);

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

  // Build markers for calendar
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

  // Build monthEvents whenever data or currentMonth changes
  useEffect(() => {
    const events: MonthEvent[] = [];

    // PTO events (date: p.date)
    ptoRecords.forEach((p, index) => {
      if (p.date && p.date.startsWith(currentMonth)) {
        events.push({
          id: `pto-${p.id ?? index}`,
          date: p.date,
          type: "PTO",
          title: p.employee_name
            ? `PTO - ${p.employee_name}`
            : `PTO - ${p.employee_id}`,
          description: `${p.hours} hours - ${p.activity}`,
        });
      }
    });

    // Birthday events (date: normalized birthday)
    birthdays.forEach((b, index) => {
      const cleanDate = normalizeDate(b.birthday);
      if (!cleanDate) return;
      if (cleanDate.startsWith(currentMonth)) {
        events.push({
          id: `birthday-${b.id ?? index}`,
          date: cleanDate,
          type: "Birthday",
          title: `Birthday - ${b.name}`,
        });
      }
    });

    // Holiday events (date: h.holiday_date)
    holidays.forEach((h, index) => {
      if (h.holiday_date && h.holiday_date.startsWith(currentMonth)) {
        events.push({
          id: `holiday-${h.id ?? index}`,
          date: h.holiday_date,
          type: "Holiday",
          title: h.holiday,
          description: h.holiday_description || undefined,
        });
      }
    });

    // Sort by date ascending
    events.sort((a, b) => {
      if (a.date < b.date) return -1;
      if (a.date > b.date) return 1;
      return 0;
    });

    setMonthEvents(events);
  }, [currentMonth, ptoRecords, birthdays, holidays]);

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

  // Determine human-readable month label
  function getCurrentMonthLabel() {
    const [year, month] = currentMonth.split("-");
    const d = new Date(Number(year), Number(month) - 1, 1);
    return d.toLocaleString(undefined, { month: "long", year: "numeric" });
  }

 return (
    <View style={styles.container}>
      {loading && <LoadingOverlay />}

      {/* TOP HEADER */}
      <View style={styles.topHeader}>
        <Text style={styles.appTitle}>DataClad</Text>
      </View>

      {/* CALENDAR CARD */}
      <View style={styles.calendarCard}>
        <Calendar
          markingType="multi-dot"
          markedDates={markedDates}
          onDayPress={handleDayPress}
          onMonthChange={(m) => {
            const mm = String(m.month).padStart(2, "0");
            setCurrentMonth(`${m.year}-${mm}`);
          }}
          style={styles.calendar}
          theme={{
            todayTextColor: "#1E3A8A",
            arrowColor: "#1E40AF",
          }}
            renderHeader={(date) => {
            const month = date.toString("MMMM yyyy"); 
            return (
              <Text style={{ 
                fontSize: 20, 
                fontWeight: "700", 
                color: "#0F172A",
                paddingVertical: 10,
              }}>
                {month}
              </Text>
            );
          }}
          
        />
      </View>

      {/* MODAL */}
      <DateDetailsModal
        selectedDate={selectedInfo}
        onClose={() => setSelectedInfo(null)}
      />

      {/* EVENTS TITLE */}
      <Text style={styles.monthHeader}>Events</Text>

      {/* EVENTS LIST */}
      <ScrollView style={styles.eventsContainer}>
        {monthEvents.length === 0 ? (
          <Text style={styles.noEventsText}>No events this month.</Text>
        ) : (
          monthEvents.map((ev) => (
            <View key={ev.id} style={styles.eventRow}>
              {/* LEFT DATE */}
              <View style={styles.eventDateCol}>
                <Text style={styles.eventDateText}>
                  {formatPrettyDate(ev.date)}
                </Text>
              </View>

              {/* RIGHT INFO */}
              <View style={styles.eventDetailCol}>
                <Text
                  style={[
                    styles.eventTypePill,
                    ev.type === "PTO"
                      ? styles.ptoPill
                      : ev.type === "Birthday"
                      ? styles.birthdayPill
                      : styles.holidayPill,
                  ]}
                >
                  {ev.type}
                </Text>

                <View style={styles.eventTextWrapper}>
                  <Text style={styles.eventTitle}>{ev.title}</Text>
                  {ev.description ? (
                    <Text style={styles.eventDesc}> • {ev.description}</Text>
                  ) : null}
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );

}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingTop: 0,
  },

  /* HEADER SECTION */
  topHeader: {
    paddingTop: 60,
    paddingBottom: 25,
    paddingHorizontal: 20,
    backgroundColor: "#1E3A8A",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  appTitle: {
    fontSize: 30,
    fontWeight: "700",
    color: "white",
  },

  /* CALENDAR CARD */
  calendarCard: {
    marginTop: -20,
    marginHorizontal: 15,
    backgroundColor: "white",
    borderRadius: 18,
    padding: 10,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 5,
    marginBottom: 20,
  },

  calendar: {
    borderRadius: 15,
  },

  /* MONTH HEADER */
  monthHeader: {
    fontSize: 20,
    fontWeight: "700",
    paddingHorizontal: 20,
    marginBottom: 10,
    color: "#0F172A",
  },

  /* EVENTS LIST */
  eventsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },

  noEventsText: {
    fontSize: 15,
    color: "#6B7280",
    marginTop: 10,
    textAlign: "center",
  },

  /* EVENT ROW */
  eventRow: {
    flexDirection: "row",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },

  eventDateCol: {
    width: 110,
  },
  eventDateText: {
    fontWeight: "700",
    color: "#1E293B",
    fontSize: 15,
  },

  eventDetailCol: {
    flex: 1,
  },

  /* EVENT TYPE PILL */
  eventTypePill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: "700",
    color: "white",
    marginBottom: 6,
  },
  ptoPill: { backgroundColor: "#22C55E" },
  birthdayPill: { backgroundColor: "#EAB308" },
  holidayPill: { backgroundColor: "#F97316" },

  /* EVENT TEXT ROW */
  eventTextWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  eventTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  eventDesc: {
    fontSize: 15,
    color: "#475569",
  },
});
