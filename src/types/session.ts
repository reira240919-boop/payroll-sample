export interface SessionData {
  employeeId: string;
  email: string;
  name: string;
  role: "employee" | "admin";
  isLoggedIn: boolean;
}

export const defaultSession: SessionData = {
  employeeId: "",
  email: "",
  name: "",
  role: "employee",
  isLoggedIn: false,
};
