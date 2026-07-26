import type { Metadata } from "next";
import CustomersManager from "@/components/admin/CustomersManager";

export const metadata: Metadata = {
  title: "Customers | Rinova Admin",
  description: "Manage Rinova customer accounts.",
};

export default function AdminCustomersPage() {
  return <CustomersManager />;
}
