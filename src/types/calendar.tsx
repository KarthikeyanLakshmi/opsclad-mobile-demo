export interface PTORecord {
  id: string
  date: string
  day: string
  hours: number
  activity?: string;
  employee_name: string
  employee_id: string
  sender_email: string
  updated_at: string
  is_pto: boolean
  status: "pending" | "approved" | "rejected"
}

export interface Employee {
  id: string
  name: string
  birthday: string
}

export interface HolidayRecord {
  id: string
  holiday: string
  holiday_date: string
  holiday_description: string
}

export interface SelectedDateInfo {
  date: Date
  ptoRecords: PTORecord[]
  birthdays: Employee[]
  holidays: HolidayRecord[]
}
