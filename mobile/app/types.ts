// Felix Taylor
// 08/29/2025

export type Status = "open" | "in_progress" | "resolved";
export type Incident = {
  id: string | number;
  title: string;
  location: string;
  status: Status;
  created_at?: string | number | Date;
};
