import React, { useEffect, useState, useMemo } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { supabase } from "@/src/lib/supabase" // adjust path if needed
import {
  format,
  parseISO,
  startOfYear,
  endOfYear,
  isFuture,
  isToday,
} from "date-fns"

interface PTORecord {
  id: string
  date: string
  day: string
  hours: number
  employee_name: string
  employee_id: string
  sender_email: string
  updated_at: string
  is_pto: boolean
  status: string
  request_reason?: string
}

interface PTORequest {
  date: string
  hours: number
  reason: string
}

interface CarryForwardRequest {
  days_to_carry: number
}

interface CarryForwardBalance {
  id: string
  employee_id: string
  employee_name: string
  sender_email: string
  year: number
  days_carried_forward: number
  days_used: number
  expires_at: string
}

interface EmployeePTOSummary {
  employee_id: string
  employee_name: string
  sender_email: string
  total_pto_hours: number
  total_pto_days: number
  remaining_pto_days: number
  non_pto_hours: number
  non_pto_days: number
  carry_forward_days: number
  effective_pto_limit: number
}

interface Employee {
  employee_id: string
  name: string
  email_id: string
}

export default function EmployeePTOTrackingScreen() {
  const [ptoRecords, setPtoRecords] = useState<PTORecord[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({ start: "", end: "" })
  const [activeTab, setActiveTab] = useState<"overview" | "reports">("overview")
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [carryForwardBalance, setCarryForwardBalance] =
    useState<CarryForwardBalance | null>(null)

  // PTO Request Modal
  const [isPTORequestOpen, setIsPTORequestOpen] = useState(false)
  const [ptoRequest, setPtoRequest] = useState<PTORequest>({
    date: "",
    hours: 8,
    reason: "",
  })
  const [submittingPTORequest, setSubmittingPTORequest] = useState(false)

  // Carry Forward Modal
  const [isCarryForwardOpen, setIsCarryForwardOpen] = useState(false)
  const [carryForwardRequest, setCarryForwardRequest] =
    useState<CarryForwardRequest>({ days_to_carry: 0 })
  const [submittingCarryForward, setSubmittingCarryForward] = useState(false)

  const BASE_PTO_LIMIT_DAYS = 12
  const currentYear = selectedYear
  const nextYear = currentYear + 1
  const yearStart = useMemo(
    () => startOfYear(new Date(currentYear, 0, 1)),
    [currentYear]
  )
  const yearEnd = useMemo(
    () => endOfYear(new Date(currentYear, 11, 31)),
    [currentYear]
  )

  const showError = (title: string, message: string) => {
    Alert.alert(title, message)
  }

  const showInfo = (title: string, message: string) => {
    Alert.alert(title, message)
  }

  const loadEmployeeInfo = async (userEmail: string) => {
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("employee_id, name, email_id")
        .eq("email_id", userEmail)
        .single()

      if (error) {
        console.error("Error loading employee info:", error)
        setCurrentEmployee({
          employee_id: "TEMP_" + Date.now(),
          name: "Unknown Employee",
          email_id: userEmail,
        })
        return
      }

      setCurrentEmployee(data as Employee)
    } catch (error) {
      console.error("Error loading employee info:", error)
      setCurrentEmployee({
        employee_id: "TEMP_" + Date.now(),
        name: "Unknown Employee",
        email_id: userEmail,
      })
    }
  }

  const loadCarryForwardBalance = async (employeeId: string, year: number) => {
    try {
      const { data, error } = await supabase
        .from("carry_forward_balances")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("year", year)
        .single()

      // PGRST116 = not found
      // @ts-ignore
      if (error && error.code !== "PGRST116") {
        console.error("Error loading carry forward balance:", error)
        return 0
      }

      if (data) {
        setCarryForwardBalance(data as CarryForwardBalance)
        return data.days_carried_forward - data.days_used
      } else {
        setCarryForwardBalance(null)
        return 0
      }
    } catch (error) {
      console.error("Error loading carry forward balance:", error)
      return 0
    }
  }

  const getCurrentUserSummary = (): EmployeePTOSummary | null => {
    if (!currentUser || !currentEmployee) return null

    const userRecords = ptoRecords.filter(
      (record) =>
        record.sender_email === currentUser.email &&
        new Date(record.date) >= yearStart &&
        new Date(record.date) <= yearEnd &&
        record.status === "approved"
    )

    const carryForwardDays = carryForwardBalance
      ? carryForwardBalance.days_carried_forward -
        carryForwardBalance.days_used
      : 0

    const effectivePtoLimit = BASE_PTO_LIMIT_DAYS + carryForwardDays

    let totalPtoHours = 0
    let nonPtoHours = 0

    userRecords.forEach((record) => {
      if (record.is_pto) totalPtoHours += record.hours
      else nonPtoHours += record.hours
    })

    const totalPtoDays = totalPtoHours / 8
    const remainingPtoDays = effectivePtoLimit - totalPtoDays
    const nonPtoDays = nonPtoHours / 8

    return {
      employee_id: currentEmployee.employee_id,
      employee_name: currentEmployee.name,
      sender_email: currentEmployee.email_id,
      total_pto_hours: totalPtoHours,
      total_pto_days: totalPtoDays,
      remaining_pto_days: Math.max(0, remainingPtoDays),
      non_pto_hours: nonPtoHours,
      non_pto_days: nonPtoDays,
      carry_forward_days: carryForwardDays,
      effective_pto_limit: effectivePtoLimit,
    }
  }

  const getFilteredRecords = () => {
    if (!currentUser) return []

    return ptoRecords.filter((record) => {
      const recordDate = new Date(record.date)
      const isCurrentUser = record.sender_email === currentUser.email
      const isInYearRange =
        recordDate >= yearStart && recordDate <= yearEnd
      const matchesCustomDateRange =
        (!dateRange.start || record.date >= dateRange.start) &&
        (!dateRange.end || record.date <= dateRange.end)

      return isCurrentUser && isInYearRange && matchesCustomDateRange
    })
  }

  const loadPTORecords = async () => {
    try {
      setLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()
      setCurrentUser(user)

      if (!user) return

      await loadEmployeeInfo(user.email!)

      const { data, error } = await supabase
        .from("pto_records")
        .select("*")
        .eq("sender_email", user.email)
        .order("date", { ascending: false })

      if (error) {
        console.error("Error loading PTO records:", error)
        showError(
          "Error Loading Data",
          "Failed to fetch your leave records. Please try again."
        )
        return
      }

      setPtoRecords((data || []) as PTORecord[])
    } catch (error) {
      console.error("Error loading PTO records:", error)
      showError(
        "Error",
        "An unexpected error occurred while loading data."
      )
    } finally {
      setLoading(false)
    }
  }

  const submitPTORequest = async () => {
    if (
      !currentUser ||
      !currentEmployee ||
      !ptoRequest.date ||
      ptoRequest.hours <= 0
    ) {
      showError("Invalid Request", "Please fill in all required fields.")
      return
    }

    const requestDate = new Date(ptoRequest.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    requestDate.setHours(0, 0, 0, 0)

    if (!isFuture(requestDate) && !isToday(requestDate)) {
      showError(
        "Invalid Date",
        "You can only request PTO for today or future dates."
      )
      return
    }

    setSubmittingPTORequest(true)

    try {
      const dayName = requestDate
        .toLocaleDateString("en-US", { weekday: "short" })
        .toUpperCase()

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
      })

      // Unique violation
      // @ts-ignore
      if (error && error.code === "23505") {
        showError(
          "Duplicate Request",
          `A PTO request for ${format(requestDate, "yyyy-MM-dd")} already exists.`
        )
        return
      }

      if (error) {
        console.error("Error submitting PTO request:", error)
        showError(
          "Submission Failed",
          "Failed to submit your PTO request. Please try again."
        )
        return
      }

      showInfo(
        "Request Submitted",
        "Your leave request has been submitted for manager approval."
      )

      setPtoRequest({ date: "", hours: 8, reason: "" })
      setIsPTORequestOpen(false)
      await loadPTORecords()
    } catch (error) {
      console.error("Unexpected error submitting PTO request:", error)
      showError(
        "Error",
        "An unexpected error occurred while submitting your request."
      )
    } finally {
      setSubmittingPTORequest(false)
    }
  }

  const submitCarryForwardRequest = async () => {
    if (
      !currentUser ||
      !currentEmployee ||
      carryForwardRequest.days_to_carry <= 0
    ) {
      showError(
        "Invalid Request",
        "Please specify the number of days to carry forward."
      )
      return
    }

    const summary = getCurrentUserSummary()
    if (!summary || carryForwardRequest.days_to_carry > summary.remaining_pto_days) {
      showError(
        "Invalid Request",
        "Cannot carry forward more days than you have remaining."
      )
      return
    }

    setSubmittingCarryForward(true)

    try {
      const { data: existingRequest, error: checkError } = await supabase
        .from("carry_forward_requests")
        .select("id, status")
        .eq("employee_id", currentEmployee.employee_id)
        .eq("from_year", currentYear)
        .eq("to_year", nextYear)
        .single()

      // @ts-ignore
      if (checkError && checkError.code !== "PGRST116") {
        console.error("Error checking existing request:", checkError)
        showError(
          "Error",
          "Failed to check existing carry forward requests."
        )
        return
      }

      if (existingRequest) {
        showError(
          "Request Already Exists",
          `You already have a ${existingRequest.status} carry forward request for ${currentYear} to ${nextYear}.`
        )
        return
      }

      const { error } = await supabase.from("carry_forward_requests").insert({
        employee_id: currentEmployee.employee_id,
        employee_name: currentEmployee.name,
        sender_email: currentUser.email,
        from_year: currentYear,
        to_year: nextYear,
        days_requested: carryForwardRequest.days_to_carry,
        status: "pending",
      })

      if (error) {
        console.error("Error submitting carry forward request:", error)
        showError(
          "Submission Failed",
          "Failed to submit your carry forward request. Please try again."
        )
        return
      }

      showInfo(
        "Request Submitted",
        `Your request to carry forward ${carryForwardRequest.days_to_carry} days to ${nextYear} has been submitted for approval.`
      )

      setCarryForwardRequest({ days_to_carry: 0 })
      setIsCarryForwardOpen(false)
    } catch (error) {
      console.error("Error submitting carry forward request:", error)
      showError(
        "Error",
        "An unexpected error occurred while submitting your request."
      )
    } finally {
      setSubmittingCarryForward(false)
    }
  }

  const filteredRecords = getFilteredRecords()
  const summary = getCurrentUserSummary()

  useEffect(() => {
    loadPTORecords()
  }, [selectedYear])

  useEffect(() => {
    if (currentEmployee) {
      loadCarryForwardBalance(currentEmployee.employee_id, selectedYear)
    }
  }, [currentEmployee, selectedYear])

  if (!currentEmployee) {
    return (
      <View className="flex-1 items-center justify-center bg-black px-6">
        <View className="w-full rounded-xl bg-white p-6">
          <View className="items-center">
            <ActivityIndicator size="large" />
            <Text className="mt-4 text-gray-700">
              Loading employee information...
            </Text>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-black px-4 pt-4">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4">
        <View>
          <Text className="text-xl font-semibold text-white">
            My Leave Tracking
          </Text>
          <Text className="mt-1 text-xs text-gray-400">
            Calendar Year {currentYear} • Your PTO limit:{" "}
            {summary?.effective_pto_limit || BASE_PTO_LIMIT_DAYS} days{" "}
            {summary && summary.carry_forward_days > 0 && (
              <Text className="text-green-400">
                (includes {summary.carry_forward_days} carried forward days)
              </Text>
            )}
          </Text>
        </View>

        <View className="items-end gap-2">
          {/* Year selector: simple +/- buttons */}
          <View className="flex-row items-center gap-1">
            <TouchableOpacity
              onPress={() => setSelectedYear((y) => y - 1)}
              className="rounded-full bg-gray-800 px-2 py-1"
            >
              <Ionicons name="chevron-back" size={16} color="white" />
            </TouchableOpacity>
            <Text className="text-white font-semibold">{selectedYear}</Text>
            <TouchableOpacity
              onPress={() => setSelectedYear((y) => y + 1)}
              className="rounded-full bg-gray-800 px-2 py-1"
            >
              <Ionicons name="chevron-forward" size={16} color="white" />
            </TouchableOpacity>
          </View>

          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => setIsPTORequestOpen(true)}
              className="flex-row items-center rounded-lg bg-orange-600 px-3 py-2"
            >
              <Ionicons
                name="add-circle-outline"
                size={18}
                color="white"
              />
              <Text className="ml-2 text-xs font-medium text-white">
                Request Leave
              </Text>
            </TouchableOpacity>

            {selectedYear === new Date().getFullYear() &&
              summary &&
              summary.remaining_pto_days > 0 && (
                <TouchableOpacity
                  onPress={() => setIsCarryForwardOpen(true)}
                  className="flex-row items-center rounded-lg border border-gray-500 px-3 py-2"
                >
                  <Ionicons
                    name="arrow-forward-circle-outline"
                    size={18}
                    color="#e5e7eb"
                  />
                  <Text className="ml-2 text-xs font-medium text-gray-200">
                    Carry Forward
                  </Text>
                </TouchableOpacity>
              )}
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View className="mb-4 flex-row rounded-full bg-gray-900 p-1">
        <TouchableOpacity
          onPress={() => setActiveTab("overview")}
          className={`flex-1 rounded-full px-3 py-2 ${
            activeTab === "overview" ? "bg-white" : ""
          }`}
        >
          <Text
            className={`text-center text-xs font-semibold ${
              activeTab === "overview" ? "text-black" : "text-gray-400"
            }`}
          >
            Leave Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab("reports")}
          className={`flex-1 rounded-full px-3 py-2 ${
            activeTab === "reports" ? "bg-white" : ""
          }`}
        >
          <Text
            className={`text-center text-xs font-semibold ${
              activeTab === "reports" ? "text-black" : "text-gray-400"
            }`}
          >
            My Analytics
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        {activeTab === "overview" && (
          <View className="space-y-4">
            {/* Date range filters */}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="mb-1 text-xs text-gray-300">
                  Start Date (YYYY-MM-DD)
                </Text>
                <TextInput
                  placeholder="2025-01-01"
                  placeholderTextColor="#6b7280"
                  value={dateRange.start}
                  onChangeText={(text) =>
                    setDateRange((prev) => ({ ...prev, start: text }))
                  }
                  className="rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
                />
              </View>
              <View className="flex-1">
                <Text className="mb-1 text-xs text-gray-300">
                  End Date (YYYY-MM-DD)
                </Text>
                <TextInput
                  placeholder="2025-12-31"
                  placeholderTextColor="#6b7280"
                  value={dateRange.end}
                  onChangeText={(text) =>
                    setDateRange((prev) => ({ ...prev, end: text }))
                  }
                  className="rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
                />
              </View>
            </View>

            {/* Records card */}
            <View className="rounded-xl bg-white p-4">
              <Text className="text-base font-semibold text-black">
                My Leave Records
              </Text>
              <Text className="mt-1 text-xs text-gray-500">
                Showing {filteredRecords.length} records for {currentYear}
              </Text>

              {loading ? (
                <View className="mt-6 items-center">
                  <ActivityIndicator size="small" />
                </View>
              ) : (
                <View className="mt-4 max-h-96">
                  {filteredRecords.length === 0 ? (
                    <View className="py-8 items-center">
                      <Text className="text-sm text-gray-500">
                        No leave records found
                      </Text>
                    </View>
                  ) : (
                    <ScrollView>
                      {filteredRecords.map((record) => (
                        <View
                          key={record.id}
                          className="mb-2 flex-row items-center justify-between rounded-lg border border-gray-200 px-3 py-2"
                        >
                          <View className="flex-[1.4]">
                            <Text className="text-xs font-semibold text-black">
                              {format(parseISO(record.date), "yyyy-MM-dd")}
                            </Text>
                            <Text className="text-[10px] text-gray-500">
                              {record.day}
                            </Text>
                          </View>

                          <View className="flex-1 items-center">
                            <View className="rounded-full border border-blue-500 px-2 py-1">
                              <Text className="text-[10px] text-blue-600">
                                {record.hours} h
                              </Text>
                            </View>
                          </View>

                          <View className="flex-1 items-center">
                            {record.status === "rejected" ? (
                              <View className="rounded-full border border-red-500 px-2 py-1">
                                <Text className="text-[10px] text-red-500">
                                  Rejected Leave
                                </Text>
                              </View>
                            ) : (
                              <View
                                className={`rounded-full border px-2 py-1 ${
                                  record.is_pto
                                    ? "border-green-500"
                                    : "border-orange-500"
                                }`}
                              >
                                <Text
                                  className={`text-[10px] ${
                                    record.is_pto
                                      ? "text-green-500"
                                      : "text-orange-500"
                                  }`}
                                >
                                  {record.is_pto ? "PTO" : "Non-PTO"}
                                </Text>
                              </View>
                            )}
                          </View>

                          <View className="flex-[1.4] items-end">
                            <View
                              className={`flex-row items-center rounded-full px-2 py-1 ${
                                record.status === "approved"
                                  ? "bg-green-100"
                                  : record.status === "pending"
                                  ? "bg-yellow-100"
                                  : "bg-red-100"
                              }`}
                            >
                              <Ionicons
                                name={
                                  record.status === "approved"
                                    ? "checkmark-circle"
                                    : record.status === "pending"
                                    ? "time"
                                    : "close-circle"
                                }
                                size={12}
                                color={
                                  record.status === "approved"
                                    ? "#16a34a"
                                    : record.status === "pending"
                                    ? "#ca8a04"
                                    : "#b91c1c"
                                }
                              />
                              <Text
                                className={`ml-1 text-[10px] ${
                                  record.status === "approved"
                                    ? "text-green-700"
                                    : record.status === "pending"
                                    ? "text-yellow-700"
                                    : "text-red-700"
                                }`}
                              >
                                {record.status === "approved"
                                  ? "Approved"
                                  : record.status === "pending"
                                  ? "Pending"
                                  : "Rejected"}
                              </Text>
                            </View>
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        {activeTab === "reports" && (
          <View className="space-y-4">
            {/* Summary card */}
            <View className="rounded-xl bg-white p-4">
              <Text className="mb-2 text-base font-semibold text-black">
                Leave Summary
              </Text>
              {summary ? (
                <View className="space-y-3">
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-gray-500">PTO Used</Text>
                    <Text className="text-xs font-semibold text-blue-600">
                      {summary.total_pto_days.toFixed(1)} days
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-gray-500">
                      PTO Remaining
                    </Text>
                    <Text
                      className={`text-xs font-semibold ${
                        summary.remaining_pto_days <= 1
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {summary.remaining_pto_days.toFixed(1)} days
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-gray-500">Non-PTO</Text>
                    <Text className="text-xs font-semibold text-orange-600">
                      {(summary.non_pto_days || 0).toFixed(1)} days
                    </Text>
                  </View>
                  {summary.carry_forward_days > 0 && (
                    <View className="flex-row justify-between">
                      <Text className="text-xs text-gray-500">
                        Carried Forward
                      </Text>
                      <Text className="text-xs font-semibold text-purple-600">
                        {summary.carry_forward_days.toFixed(1)} days
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <Text className="text-xs text-gray-500">
                  No summary data available.
                </Text>
              )}
            </View>

            {/* Very simple bar visual instead of Recharts */}
            {summary && (
              <View className="rounded-xl bg-white p-4">
                <View className="mb-2 flex-row items-center">
                  <Ionicons name="bar-chart-outline" size={18} color="black" />
                  <Text className="ml-2 text-base font-semibold text-black">
                    PTO Usage
                  </Text>
                </View>

                <Text className="mb-2 text-xs text-gray-500">
                  Visual representation (stacked bar, days)
                </Text>

                <View className="h-4 w-full overflow-hidden rounded-full bg-gray-200">
                  {/* PTO used */}
                  <View
                    className="h-full bg-emerald-500"
                    style={{
                      width: `${Math.min(
                        100,
                        (summary.total_pto_days /
                          summary.effective_pto_limit) *
                          100
                      )}%`,
                    }}
                  />
                  {/* Remaining is implied by grey background */}
                </View>

                <View className="mt-3 space-y-1">
                  <View className="flex-row items-center gap-2">
                    <View className="h-2 w-2 rounded-full bg-emerald-500" />
                    <Text className="text-[11px] text-gray-700">
                      PTO Used: {summary.total_pto_days.toFixed(1)} /{" "}
                      {summary.effective_pto_limit.toFixed(1)} days
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <View className="h-2 w-2 rounded-full bg-gray-400" />
                    <Text className="text-[11px] text-gray-700">
                      Remaining: {summary.remaining_pto_days.toFixed(1)} days
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <View className="h-2 w-2 rounded-full bg-orange-400" />
                    <Text className="text-[11px] text-gray-700">
                      Non-PTO: {summary.non_pto_days.toFixed(1)} days
                    </Text>
                  </View>
                  {summary.carry_forward_days > 0 && (
                    <View className="flex-row items-center gap-2">
                      <View className="h-2 w-2 rounded-full bg-purple-500" />
                      <Text className="text-[11px] text-gray-700">
                        Carried Forward:{" "}
                        {summary.carry_forward_days.toFixed(1)} days
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* PTO Request Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={isPTORequestOpen}
        onRequestClose={() => setIsPTORequestOpen(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/60 px-4">
          <View className="w-full rounded-2xl bg-gray-950 p-4">
            <Text className="text-base font-semibold text-white mb-1">
              Request Leave
            </Text>
            <Text className="mb-4 text-xs text-gray-400">
              Submit a new leave request for manager approval.
            </Text>

            <View className="mb-3">
              <Text className="mb-1 text-xs text-gray-200">Date</Text>
              <TextInput
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#6b7280"
                value={ptoRequest.date}
                onChangeText={(text) =>
                  setPtoRequest((prev) => ({ ...prev, date: text }))
                }
                className="rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
              />
            </View>

            <View className="mb-3">
              <Text className="mb-1 text-xs text-gray-200">Hours</Text>
              <TextInput
                keyboardType="numeric"
                value={String(ptoRequest.hours)}
                onChangeText={(text) =>
                  setPtoRequest((prev) => ({
                    ...prev,
                    hours: parseInt(text || "0", 10) || 0,
                  }))
                }
                className="rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
              />
            </View>

            <View className="mb-3">
              <Text className="mb-1 text-xs text-gray-200">
                Reason (Optional)
              </Text>
              <TextInput
                value={ptoRequest.reason}
                onChangeText={(text) =>
                  setPtoRequest((prev) => ({ ...prev, reason: text }))
                }
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                className="rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
                placeholder="Brief reason for PTO request..."
                placeholderTextColor="#6b7280"
              />
            </View>

            <View className="mt-4 flex-row justify-end gap-3">
              <TouchableOpacity
                onPress={() => setIsPTORequestOpen(false)}
                className="rounded-lg border border-gray-600 px-3 py-2"
              >
                <Text className="text-xs font-medium text-gray-200">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitPTORequest}
                disabled={submittingPTORequest}
                className="flex-row items-center rounded-lg bg-orange-600 px-4 py-2"
              >
                {submittingPTORequest ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons
                    name="send-outline"
                    size={16}
                    color="white"
                  />
                )}
                <Text className="ml-2 text-xs font-semibold text-white">
                  {submittingPTORequest ? "Submitting..." : "Submit Request"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Carry Forward Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={isCarryForwardOpen}
        onRequestClose={() => setIsCarryForwardOpen(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/60 px-4">
          <View className="w-full rounded-2xl bg-gray-950 p-4">
            <Text className="text-base font-semibold text-white mb-1">
              Request PTO Carry Forward
            </Text>
            <Text className="mb-3 text-xs text-gray-400">
              Request to carry forward unused PTO days to {nextYear}.
            </Text>

            {summary && (
              <View className="mb-3 rounded-md bg-blue-50 px-3 py-2">
                <Text className="text-[11px] text-blue-800">
                  You have{" "}
                  <Text className="font-bold">
                    {summary.remaining_pto_days.toFixed(1)} days
                  </Text>{" "}
                  remaining that can be carried forward.
                </Text>
              </View>
            )}

            <View className="mb-3">
              <Text className="mb-1 text-xs text-gray-200">
                Days to Carry Forward
              </Text>
              <TextInput
                keyboardType="numeric"
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
                className="rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
              />
              <Text className="mt-1 text-[10px] text-gray-400">
                Maximum:{" "}
                {summary
                  ? summary.remaining_pto_days.toFixed(1)
                  : "0.0"}{" "}
                days available to carry forward
              </Text>
            </View>

            <View className="mt-4 flex-row justify-end gap-3">
              <TouchableOpacity
                onPress={() => setIsCarryForwardOpen(false)}
                className="rounded-lg border border-gray-600 px-3 py-2"
              >
                <Text className="text-xs font-medium text-gray-200">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitCarryForwardRequest}
                disabled={
                  submittingCarryForward ||
                  !carryForwardRequest.days_to_carry
                }
                className="flex-row items-center rounded-lg bg-green-600 px-4 py-2"
              >
                {submittingCarryForward ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons
                    name="arrow-forward-circle-outline"
                    size={16}
                    color="white"
                  />
                )}
                <Text className="ml-2 text-xs font-semibold text-white">
                  {submittingCarryForward
                    ? "Submitting..."
                    : "Submit Request"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}
