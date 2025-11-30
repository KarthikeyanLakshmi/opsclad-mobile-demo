import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
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
  if (date.includes("T")) return date.split("T")[0];
  if (date.includes("/")) {
    const [day, month, year] = date.split("/");
    return `${year}-${month}-${day}`;
  }
  return date;
}

function formatPrettyDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return dateStr;
  }
}

type EventType = "PTO" | "Birthday" | "Holiday";

interface MonthEvent {
  id: string;
  date: string;
  type: EventType;
  title: string;
  description?: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [markedDates, setMarkedDates] = useState<any>({});
  const [selectedInfo, setSelectedInfo] = useState<SelectedDateInfo | null>(null);

  const [ptoRecords, setPtoRecords] = useState<PTORecord[]>([]);
  const [birthdays, setBirthdays] = useState<Employee[]>([]);
  const [holidays, setHolidays] = useState<HolidayRecord[]>([]);

  // Visible month
  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  });

  const [monthEvents, setMonthEvents] = useState<MonthEvent[]>([]);

  // Load data
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

  // 🔥 BUILD MARKERS WITH MAX 3 DOT LIMIT
  useEffect(() => {
    const marks: any = {};
    const currentYear = new Date().getFullYear();

    function addDot(date: string, color: string) {
      if (!marks[date]) marks[date] = { dots: [] };
      if (marks[date].dots.length < 3) {
        marks[date].dots.push({ color });
      }
    }

    // PTO dots
    ptoRecords.forEach((p) => {
      addDot(p.date, "green");
    });

    // Birthday dots (converted to current year)
    birthdays.forEach((b) => {
      const clean = normalizeDate(b.birthday);
      if (!clean) return;
      const [, mm, dd] = clean.split("-");
      const birthdayDate = `${currentYear}-${mm}-${dd}`;
      addDot(birthdayDate, "yellow");
    });

    // Holiday dots
    holidays.forEach((h) => {
      addDot(h.holiday_date, "orange");
    });

    setMarkedDates(marks);
  }, [ptoRecords, birthdays, holidays]);

  // 🔥 BUILD MONTH EVENTS (Birthdays converted to current year)
  useEffect(() => {
    const events: MonthEvent[] = [];
    const [year, month] = currentMonth.split("-");
    const currentYear = Number(year);

    // PTO
    ptoRecords.forEach((p, idx) => {
      if (p.date.startsWith(currentMonth)) {
        events.push({
          id: `pto-${p.id}`,
          date: p.date,
          type: "PTO",
          title: p.employee_name ? `PTO - ${p.employee_name}` : `PTO - ${p.employee_id}`,
          description: `${p.hours} hours - ${p.activity}`,
        });
      }
    });

    // Birthday events (repeat yearly)
    birthdays.forEach((b) => {
      const clean = normalizeDate(b.birthday);
      if (!clean) return;

      const [, mm, dd] = clean.split("-");
      if (mm === month) {
        const birthdayDate = `${currentYear}-${mm}-${dd}`;
        events.push({
          id: `birthday-${b.id}`,
          date: birthdayDate,
          type: "Birthday",
          title: `Birthday - ${b.name}`,
        });
      }
    });

    // Holidays
    holidays.forEach((h) => {
      if (h.holiday_date.startsWith(currentMonth)) {
        events.push({
          id: `holiday-${h.id}`,
          date: h.holiday_date,
          type: "Holiday",
          title: h.holiday,
          description: h.holiday_description || undefined,
        });
      }
    });

    // Sort by date
    events.sort((a, b) => a.date.localeCompare(b.date));
    setMonthEvents(events);
  }, [currentMonth, ptoRecords, birthdays, holidays]);

  // DAY PRESS HANDLER (MODAL)
  const handleDayPress = (day: any) => {
    const clickedDate = day.dateString;
    const currentYear = new Date().getFullYear();

    const selected: SelectedDateInfo = {
      date: new Date(clickedDate),

      // PTO
      ptoRecords: ptoRecords.filter((p) => p.date === clickedDate),

      // Birthday (map to current year)
      birthdays: birthdays.filter((b) => {
        const clean = normalizeDate(b.birthday);
        if (!clean) return false;
        const [, mm, dd] = clean.split("-");
        const dateThisYear = `${currentYear}-${mm}-${dd}`;
        return dateThisYear === clickedDate;
      }),

      // Holiday
      holidays: holidays.filter((h) => h.holiday_date === clickedDate),
    };

    setSelectedInfo(selected);
  };

  return (
    <View style={styles.container}>
      {loading && <LoadingOverlay />}

      {/* Simple Header */}
      <View style={styles.simpleHeader}>
        <Text style={styles.simpleHeaderTitle}>DataClad</Text>
      </View>

      {/* Calendar */}
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
          renderHeader={(date) => (
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: "#0F172A",
                paddingVertical: 6,
                textAlign: "center",
              }}
            >
              {date.toString("MMMM yyyy")}
            </Text>
          )}
          theme={{
            todayTextColor: "#1E3A8A",
            arrowColor: "#1E40AF",
          }}
        />
      </View>

      {/* Modal */}
      <DateDetailsModal
        selectedDate={selectedInfo}
        onClose={() => setSelectedInfo(null)}
      />

      {/* Events */}

      <Text style={styles.monthHeader}>Events</Text>

      <ScrollView style={styles.eventsContainer}>
        {monthEvents.length === 0 ? (
          <Text style={styles.noEventsText}>No events this month.</Text>
        ) : (
          monthEvents.map((ev) => (
            <View key={ev.id} style={styles.eventRow}>
              <View style={styles.eventDateCol}>
                <Text style={styles.eventDateText}>
                  {formatPrettyDate(ev.date)}
                </Text>
              </View>

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
                  {ev.description && (
                    <Text style={styles.eventDesc}> • {ev.description}</Text>
                  )}
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
  },
  simpleHeader: {
    paddingTop: 55,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  simpleHeaderTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#0F172A",
  },
  calendarCard: {
    marginTop: 10,
    marginHorizontal: 15,
    backgroundColor: "white",
    borderRadius: 18,
    padding: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  calendar: {
    borderRadius: 15,
  },
  monthHeader: {
    fontSize: 20,
    fontWeight: "700",
    paddingHorizontal: 20,
    marginBottom: 10,
    color: "#0F172A",
  },
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
  eventTextWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  eventTypePill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 50,
    fontSize: 11,
    fontWeight: "700",
    color: "white",
    marginBottom: 6,
  },
  ptoPill: { backgroundColor: "#22C55E" },
  birthdayPill: { backgroundColor: "#EAB308" },
  holidayPill: { backgroundColor: "#F97316" },
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
