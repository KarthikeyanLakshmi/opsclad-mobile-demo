import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/src/lib/supabase";
import {
  format,
  parseISO,
  startOfYear,
  endOfYear,
  isFuture,
  isToday,
} from "date-fns";

/* ------------------------- TYPES ------------------------- */
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
  status: string;
  request_reason?: string;
}

interface PTORequest {
  date: string;
  hours: number;
  reason: string;
}

interface CarryForwardRequest {
  days_to_carry: number;
}

interface CarryForwardBalance {
  id: string;
  employee_id: string;
  employee_name: string;
  sender_email: string;
  year: number;
  days_carried_forward: number;
  days_used: number;
  expires_at: string;
}

interface EmployeePTOSummary {
  employee_id: string;
  employee_name: string;
  sender_email: string;
  total_pto_hours: number;
  total_pto_days: number;
  remaining_pto_days: number;
  non_pto_hours: number;
  non_pto_days: number;
  carry_forward_days: number;
  effective_pto_limit: number;
}

interface Employee {
  employee_id: string;
  name: string;
  email_id: string;
}

/* ------------------------- MAIN SCREEN ------------------------- */
export default function EmployeePTOTrackingScreen() {
  const [ptoRecords, setPtoRecords] = useState<PTORecord[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [carryForwardBalance, setCarryForwardBalance] =
    useState<CarryForwardBalance | null>(null);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "reports">("overview");

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  const [isPTORequestOpen, setIsPTORequestOpen] = useState(false);
  const [ptoRequest, setPtoRequest] = useState<PTORequest>({
    date: "",
    hours: 8,
    reason: "",
  });

  const [isCarryForwardOpen, setIsCarryForwardOpen] = useState(false);
  const [carryForwardRequest, setCarryForwardRequest] =
    useState<CarryForwardRequest>({ days_to_carry: 0 });

  const [submittingPTO, setSubmittingPTO] = useState(false);
  const [submittingCarryForward, setSubmittingCarryForward] = useState(false);

  const BASE_PTO_LIMIT_DAYS = 12;
  const currentYear = selectedYear;
  const nextYear = currentYear + 1;

  const yearStart = useMemo(
    () => startOfYear(new Date(currentYear, 0, 1)),
    [currentYear]
  );
  const yearEnd = useMemo(
    () => endOfYear(new Date(currentYear, 11, 31)),
    [currentYear]
  );

  /* ------------------------- HELPERS ------------------------- */

  const showError = (title: string, message: string) =>
    Alert.alert(title, message);

  const showInfo = (title: string, message: string) =>
    Alert.alert(title, message);

  const loadEmployeeInfo = async (userEmail: string) => {
    const { data, error } = await supabase
      .from("employees")
      .select("employee_id, name, email_id")
      .eq("email_id", userEmail)
      .single();

    if (!error && data) {
      setCurrentEmployee(data as Employee);
    } else {
      setCurrentEmployee({
        employee_id: "TEMP_" + Date.now(),
        name: "Unknown Employee",
        email_id: userEmail,
      });
    }
  };

  const loadCarryForwardBalance = async (empId: string, year: number) => {
    const { data, error } = await supabase
      .from("carry_forward_balances")
      .select("*")
      .eq("employee_id", empId)
      .eq("year", year)
      .single();

    // PGRST116 = not found
    // @ts-ignore
    if (error && error.code !== "PGRST116") {
      console.error("Error loading carry forward:", error);
      return 0;
    }

    if (!data) {
      setCarryForwardBalance(null);
      return 0;
    }

    setCarryForwardBalance(data);
    const daysRemaining =
      (data.days_carried_forward ?? 0) - (data.days_used ?? 0);
    return daysRemaining;
  };

  const getSummary = (): EmployeePTOSummary | null => {
    if (!currentEmployee) return null;

    const userRecords = ptoRecords.filter((r) => {
      const d = new Date(r.date);
      return (
        r.sender_email === currentEmployee.email_id &&
        r.status === "approved" &&
        d >= yearStart &&
        d <= yearEnd
      );
    });

    const carryDays =
      (carryForwardBalance?.days_carried_forward ?? 0) -
      (carryForwardBalance?.days_used ?? 0);

    let ptoHours = 0;
    let nonPtoHours = 0;

    userRecords.forEach((rec) =>
      rec.is_pto ? (ptoHours += rec.hours) : (nonPtoHours += rec.hours)
    );

    const ptoDays = ptoHours / 8;
    const nonPtoDays = nonPtoHours / 8;
    const effectiveLimit = BASE_PTO_LIMIT_DAYS + carryDays;
    const remaining = Math.max(0, effectiveLimit - ptoDays);

    return {
      employee_id: currentEmployee.employee_id,
      employee_name: currentEmployee.name,
      sender_email: currentEmployee.email_id,
      total_pto_hours: ptoHours,
      total_pto_days: ptoDays,
      remaining_pto_days: remaining,
      non_pto_hours: nonPtoHours,
      non_pto_days: nonPtoDays,
      carry_forward_days: carryDays,
      effective_pto_limit: effectiveLimit,
    };
  };

  const filteredRecords = () =>
    ptoRecords.filter((r) => {
      const d = new Date(r.date);
      return (
        r.sender_email === currentEmployee?.email_id &&
        d >= yearStart &&
        d <= yearEnd &&
        (!dateRange.start || r.date >= dateRange.start) &&
        (!dateRange.end || r.date <= dateRange.end)
      );
    });

  /* ------------------------- LOAD DATA ------------------------- */

  const loadPTORecords = async () => {
    try {
      setLoading(true);

      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      setCurrentUser(user);

      if (!user) {
        setLoading(false);
        return;
      }

      await loadEmployeeInfo(user.email!);

      const { data, error } = await supabase
        .from("pto_records")
        .select("*")
        .eq("sender_email", user.email)
        .order("date", { ascending: false });

      if (error) {
        console.error("Error loading PTO records:", error);
        showError(
          "Error Loading Data",
          "Failed to fetch leave records. Please try again."
        );
        setLoading(false);
        return;
      }

      setPtoRecords((data || []) as PTORecord[]);
    } catch (err) {
      console.error("Error loading PTO records:", err);
      showError(
        "Error",
        "An unexpected error occurred while loading your data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPTORecords();
  }, [selectedYear]);

  useEffect(() => {
    if (currentEmployee) {
      loadCarryForwardBalance(currentEmployee.employee_id, selectedYear);
    }
  }, [currentEmployee, selectedYear]);

  /* ------------------------- ACTIONS ------------------------- */

  const submitPTORequest = async () => {
    if (
      !currentUser ||
      !currentEmployee ||
      !ptoRequest.date ||
      ptoRequest.hours <= 0
    ) {
      showError("Invalid Request", "Please fill in all required fields.");
      return;
    }

    const requestDate = new Date(ptoRequest.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    requestDate.setHours(0, 0, 0, 0);

    if (!isFuture(requestDate) && !isToday(requestDate)) {
      showError(
        "Invalid Date",
        "You can only request PTO for today or future dates."
      );
      return;
    }

    setSubmittingPTO(true);

    try {
      const dayName = requestDate
        .toLocaleDateString("en-US", { weekday: "short" })
        .toUpperCase();

      const { error } = await supabase.from("pto_records").insert({
        date: ptoRequest.date,
        day: dayName,
        hours: ptoRequest.hours,
        employee_name: currentEmployee.name,
        employee_id: currentEmployee.employee_id,
        sender_email: currentUser.email,
        activity: "PTO Request",
        status: "pending",
        request_reason: ptoRequest.reason,
        is_pto: false,
      });

      // Unique violation
      // @ts-ignore
      if (error && error.code === "23505") {
        showError(
          "Duplicate Request",
          `A PTO request for ${format(requestDate, "yyyy-MM-dd")} already exists.`
        );
        return;
      }

      if (error) {
        console.error("Error submitting PTO request:", error);
        showError(
          "Submission Failed",
          "Failed to submit your PTO request. Please try again."
        );
        return;
      }

      showInfo(
        "Request Submitted",
        "Your leave request has been submitted for manager approval."
      );

      setPtoRequest({ date: "", hours: 8, reason: "" });
      setIsPTORequestOpen(false);
      await loadPTORecords();
    } catch (err) {
      console.error("Unexpected error submitting PTO request:", err);
      showError(
        "Error",
        "An unexpected error occurred while submitting your request."
      );
    } finally {
      setSubmittingPTO(false);
    }
  };

  const submitCarryForwardRequest = async () => {
    if (
      !currentUser ||
      !currentEmployee ||
      carryForwardRequest.days_to_carry <= 0
    ) {
      showError(
        "Invalid Request",
        "Please specify the number of days to carry forward."
      );
      return;
    }

    const summary = getSummary();
    if (
      !summary ||
      carryForwardRequest.days_to_carry > summary.remaining_pto_days
    ) {
      showError(
        "Invalid Request",
        "Cannot carry forward more days than you have remaining."
      );
      return;
    }

    setSubmittingCarryForward(true);

    try {
      const { data: existingRequest, error: checkError } = await supabase
        .from("carry_forward_requests")
        .select("id, status")
        .eq("employee_id", currentEmployee.employee_id)
        .eq("from_year", currentYear)
        .eq("to_year", nextYear)
        .single();

      // @ts-ignore
      if (checkError && checkError.code !== "PGRST116") {
        console.error("Error checking existing request:", checkError);
        showError(
          "Error",
          "Failed to check existing carry forward requests."
        );
        return;
      }

      if (existingRequest) {
        showError(
          "Request Already Exists",
          `You already have a ${existingRequest.status} carry forward request for ${currentYear} to ${nextYear}.`
        );
        return;
      }

      const { error } = await supabase.from("carry_forward_requests").insert({
        employee_id: currentEmployee.employee_id,
        employee_name: currentEmployee.name,
        sender_email: currentUser.email,
        from_year: currentYear,
        to_year: nextYear,
        days_requested: carryForwardRequest.days_to_carry,
        status: "pending",
      });

      if (error) {
        console.error("Error submitting carry forward request:", error);
        showError(
          "Submission Failed",
          "Failed to submit your carry forward request. Please try again."
        );
        return;
      }

      showInfo(
        "Request Submitted",
        `Your request to carry forward ${carryForwardRequest.days_to_carry} days to ${nextYear} has been submitted for approval.`
      );

      setCarryForwardRequest({ days_to_carry: 0 });
      setIsCarryForwardOpen(false);
    } catch (err) {
      console.error("Error submitting carry forward request:", err);
      showError(
        "Error",
        "An unexpected error occurred while submitting your request."
      );
    } finally {
      setSubmittingCarryForward(false);
    }
  };

  /* ------------------------- RENDER ------------------------- */

  if (!currentEmployee) {
    return (
      <View style={[styles.center, { backgroundColor: "#f4f4f5" }]}>
        <ActivityIndicator size="large" color="#111827" />
        <Text style={{ color: "#4b5563", marginTop: 8 }}>
          Loading employee information...
        </Text>
      </View>
    );
  }

  const summary = getSummary();
  const records = filteredRecords();

  return (
    <View style={[styles.container, { backgroundColor: "#f4f4f5" }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Leave Tracking</Text>
          <Text style={styles.headerSubtitle}>
            Year {currentYear} • PTO limit:{" "}
            {summary?.effective_pto_limit || BASE_PTO_LIMIT_DAYS} days
          </Text>
        </View>
      </View>

      {/* Year Selector */}
      <View style={styles.yearRow}>
        <TouchableOpacity
          onPress={() => setSelectedYear((y) => y - 1)}
          style={styles.yearBtn}
        >
          <Ionicons name="chevron-back" size={16} color="#111827" />
        </TouchableOpacity>

        <Text style={styles.yearText}>{selectedYear}</Text>

        <TouchableOpacity
          onPress={() => setSelectedYear((y) => y + 1)}
          style={styles.yearBtn}
        >
          <Ionicons name="chevron-forward" size={16} color="#111827" />
        </TouchableOpacity>
      </View>

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.btnPrimary, { backgroundColor: "#ea580c" }]}
          onPress={() => setIsPTORequestOpen(true)}
        >
          <Ionicons name="add-circle-outline" size={16} color="white" />
          <Text style={styles.btnText}>Request Leave</Text>
        </TouchableOpacity>

        {summary && summary.remaining_pto_days > 0 && (
          <TouchableOpacity
            style={[styles.btnSecondary, { borderColor: "#d1d5db" }]}
            onPress={() => setIsCarryForwardOpen(true)}
          >
            <Ionicons
              name="arrow-forward-circle-outline"
              size={16}
              color="#111827"
            />
            <Text style={styles.btnTextSecondary}>Carry Forward</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          onPress={() => setActiveTab("overview")}
          style={[
            styles.tab,
            activeTab === "overview" && styles.activeTab,
          ]}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "overview" && styles.tabTextActive,
            ]}
          >
            Leave Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("reports")}
          style={[
            styles.tab,
            activeTab === "reports" && styles.activeTab,
          ]}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "reports" && styles.tabTextActive,
            ]}
          >
            My Analytics
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }}>
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <View>
            {/* Date filters */}
            <View style={styles.filterRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Start Date</Text>
                <TextInput
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9ca3af"
                  style={styles.input}
                  value={dateRange.start}
                  onChangeText={(text) =>
                    setDateRange((prev) => ({ ...prev, start: text }))
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>End Date</Text>
                <TextInput
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9ca3af"
                  style={styles.input}
                  value={dateRange.end}
                  onChangeText={(text) =>
                    setDateRange((prev) => ({ ...prev, end: text }))
                  }
                />
              </View>
            </View>

            {/* Records card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>My Leave Records</Text>
              <Text style={styles.cardSubtitle}>
                Showing {records.length} records for {currentYear}
              </Text>

              {loading ? (
                <View style={{ marginTop: 16, alignItems: "center" }}>
                  <ActivityIndicator size="small" color="#111827" />
                </View>
              ) : records.length === 0 ? (
                <View style={{ marginTop: 20, alignItems: "center" }}>
                  <Text style={{ color: "#6b7280" }}>
                    No leave records found.
                  </Text>
                </View>
              ) : (
                records.map((rec) => (
                  <View
                    key={rec.id}
                    style={[styles.recordRow, { borderColor: "#e5e7eb" }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#111827", fontSize: 13 }}>
                        {format(parseISO(rec.date), "yyyy-MM-dd")}
                      </Text>
                      <Text style={{ color: "#6b7280", fontSize: 11 }}>
                        {rec.day}
                      </Text>
                    </View>

                    <View style={styles.badgeSmall}>
                      <Text style={{ color: "#1d4ed8", fontSize: 11 }}>
                        {rec.hours} h
                      </Text>
                    </View>

                    <View style={styles.badgeSmall}>
                      <Text
                        style={{
                          color: rec.is_pto ? "#0f766e" : "#d97706",
                          fontSize: 11,
                        }}
                      >
                        {rec.is_pto ? "PTO" : "Non-PTO"}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            rec.status === "approved"
                              ? "#dcfce7"
                              : rec.status === "pending"
                              ? "#fef9c3"
                              : "#fee2e2",
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          rec.status === "approved"
                            ? "checkmark-circle"
                            : rec.status === "pending"
                            ? "time"
                            : "close-circle"
                        }
                        size={12}
                        color={
                          rec.status === "approved"
                            ? "#16a34a"
                            : rec.status === "pending"
                            ? "#ca8a04"
                            : "#b91c1c"
                        }
                      />
                      <Text style={styles.statusText}>
                        {rec.status.charAt(0).toUpperCase() +
                          rec.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* REPORTS TAB */}
        {activeTab === "reports" && summary && (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Leave Summary</Text>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>PTO Used</Text>
                <Text style={[styles.summaryValue, { color: "#1d4ed8" }]}>
                  {summary.total_pto_days.toFixed(1)} days
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>PTO Remaining</Text>
                <Text
                  style={[
                    styles.summaryValue,
                    {
                      color:
                        summary.remaining_pto_days <= 1
                          ? "#dc2626"
                          : "#16a34a",
                    },
                  ]}
                >
                  {summary.remaining_pto_days.toFixed(1)} days
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Non-PTO</Text>
                <Text style={[styles.summaryValue, { color: "#d97706" }]}>
                  {summary.non_pto_days.toFixed(1)} days
                </Text>
              </View>

              {summary.carry_forward_days > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Carried Forward</Text>
                  <Text style={[styles.summaryValue, { color: "#7c3aed" }]}>
                    {summary.carry_forward_days.toFixed(1)} days
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>PTO Usage</Text>
              <Text style={styles.cardSubtitle}>
                Visual representation of used vs total
              </Text>

              <View style={styles.barBg}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${
                        Math.min(
                          100,
                          (summary.total_pto_days /
                            summary.effective_pto_limit) *
                            100
                        ) || 0
                      }%`,
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* PTO Request Modal */}
      <Modal
        visible={isPTORequestOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsPTORequestOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Request Leave</Text>

            <TextInput
              placeholder="Date (YYYY-MM-DD)"
              placeholderTextColor="#9ca3af"
              style={styles.modalInput}
              value={ptoRequest.date}
              onChangeText={(text) =>
                setPtoRequest((prev) => ({ ...prev, date: text }))
              }
            />

            <TextInput
              placeholder="Hours (e.g., 8)"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              style={styles.modalInput}
              value={String(ptoRequest.hours)}
              onChangeText={(text) =>
                setPtoRequest((prev) => ({
                  ...prev,
                  hours: parseInt(text || "0", 10) || 0,
                }))
              }
            />

            <TextInput
              placeholder="Reason (optional)"
              placeholderTextColor="#9ca3af"
              style={[styles.modalInput, { height: 80 }]}
              multiline
              value={ptoRequest.reason}
              onChangeText={(text) =>
                setPtoRequest((prev) => ({ ...prev, reason: text }))
              }
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setIsPTORequestOpen(false)}
                style={[styles.modalBtn, { borderColor: "#d1d5db" }]}
              >
                <Text style={{ color: "#374151" }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={submitPTORequest}
                disabled={submittingPTO}
                style={[
                  styles.modalBtn,
                  {
                    backgroundColor: "#ea580c",
                    borderColor: "#ea580c",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                  },
                ]}
              >
                {submittingPTO ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons
                      name="send-outline"
                      size={16}
                      color="#ffffff"
                    />
                    <Text style={{ color: "#ffffff", marginLeft: 6 }}>
                      Submit
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Carry Forward Modal */}
      <Modal
        visible={isCarryForwardOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsCarryForwardOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Carry Forward PTO</Text>

            {summary && (
              <Text style={styles.modalHint}>
                You have{" "}
                <Text style={{ fontWeight: "600" }}>
                  {summary.remaining_pto_days.toFixed(1)} days
                </Text>{" "}
                remaining for {currentYear}.
              </Text>
            )}

            <TextInput
              placeholder="Days to carry forward"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              style={styles.modalInput}
              value={
                carryForwardRequest.days_to_carry
                  ? String(carryForwardRequest.days_to_carry)
                  : ""
              }
              onChangeText={(text) =>
                setCarryForwardRequest((prev) => ({
                  ...prev,
                  days_to_carry: parseFloat(text || "0") || 0,
                }))
              }
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setIsCarryForwardOpen(false)}
                style={[styles.modalBtn, { borderColor: "#d1d5db" }]}
              >
                <Text style={{ color: "#374151" }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={submitCarryForwardRequest}
                disabled={
                  submittingCarryForward ||
                  !carryForwardRequest.days_to_carry
                }
                style={[
                  styles.modalBtn,
                  {
                    backgroundColor: "#16a34a",
                    borderColor: "#16a34a",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                  },
                ]}
              >
                {submittingCarryForward ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons
                      name="arrow-forward-circle-outline"
                      size={16}
                      color="#ffffff"
                    />
                    <Text style={{ color: "#ffffff", marginLeft: 6 }}>
                      Submit
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ------------------------- STYLES ------------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 14,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },

  yearRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  yearBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: "#e5e7eb",
  },
  yearText: {
    marginHorizontal: 10,
    fontWeight: "600",
    color: "#111827",
  },

  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 10,
    gap: 10,
  },
  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  btnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  btnText: {
    color: "#ffffff",
    marginLeft: 6,
    fontSize: 12,
    fontWeight: "600",
  },
  btnTextSecondary: {
    color: "#111827",
    marginLeft: 6,
    fontSize: 12,
    fontWeight: "500",
  },

  tabs: {
    flexDirection: "row",
    backgroundColor: "#e5e7eb",
    borderRadius: 20,
    padding: 4,
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: "center",
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: "#ffffff",
  },
  tabText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#111827",
    fontWeight: "700",
  },

  filterRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    color: "#4b5563",
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: "#111827",
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },

  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  badgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#eff6ff",
    marginHorizontal: 4,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    marginLeft: 4,
    fontSize: 11,
    color: "#111827",
    textTransform: "capitalize",
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#6b7280",
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
  },

  barBg: {
    marginTop: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
    overflow: "hidden",
  },
  barFill: {
    height: 10,
    backgroundColor: "#16a34a",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 20,
  },
  modalBox: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  modalHint: {
    fontSize: 12,
    color: "#4b5563",
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: "#111827",
    marginBottom: 10,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
    gap: 10,
  },
  modalBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
