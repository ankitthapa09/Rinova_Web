import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

/** Marketing pages, full chrome, navbar and footer. */
export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  );
}
