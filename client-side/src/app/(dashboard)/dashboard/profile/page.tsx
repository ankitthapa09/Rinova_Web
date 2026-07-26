import type { Metadata } from "next";
import ProfileView from "@/components/dashboard/ProfileView";

export const metadata: Metadata = {
  title: "Profile | Rinova",
  description: "Your account details and security settings.",
};

export default function ProfilePage() {
  return <ProfileView />;
}
