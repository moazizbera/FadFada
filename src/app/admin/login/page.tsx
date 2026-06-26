import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { AdminLoginClient } from "./admin-login-client";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user && "role" in session.user ? session.user.role : null;

  if (role === "ADMIN") {
    redirect("/admin/dashboard");
  }

  return <AdminLoginClient />;
}