import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CHAIRMAN_EMAIL } from "@/lib/constants";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Only allow the real Chairman
  if (!user || user.email !== CHAIRMAN_EMAIL) {
    redirect("/");
  }

  return <>{children}</>;
}