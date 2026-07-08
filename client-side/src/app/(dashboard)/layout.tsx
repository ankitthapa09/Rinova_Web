/** Dashboard pages: chromeless — DashboardView brings its own sidebar shell. */
export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <main>{children}</main>;
}
