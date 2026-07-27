import DashboardShell from "@/components/dashboard/DashboardShell";

/**
 * Wraps every /dashboard/* page in the customer shell, one place for the
 * session guard and the sidebar. Admins are redirected to /admin by the shell.
 */
export default function DashboardAreaLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <DashboardShell>{children}</DashboardShell>;
}
