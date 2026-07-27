import AdminShell from "@/components/admin/AdminShell";

/**
 * Wraps every /admin/* page in the admin shell, one place for the role guard
 * and the operator sidebar. Non-admins never get past AdminShell.
 */
export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AdminShell>{children}</AdminShell>;
}
