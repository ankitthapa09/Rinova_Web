/** Auth pages, no navbar or footer, the AuthShell brings its own chrome. */
export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <main>{children}</main>;
}
