"use server"

import LayoutShell from "./layoutShell";
import { redirect } from "next/navigation";
import db from "@/lib/db";
import { cookies } from "next/headers";

export default async function AdminLayout({ children }) {
  const cookieStore = await cookies();
  const uid = cookieStore.get("uuid")?.value;

  if (!uid) {
    redirect("/Login");
  }

  let user = null;

  try {
    const [rows] = await db.execute(
      "SELECT * FROM MemberInfo WHERE uuid = ? LIMIT 1",
      [uid],
    );
    user = rows[0];
  } catch (error) {
    console.error("Database error during admin check:", error);
    redirect("/");
  }


  const allowedRoles = [1, 2];

  if (!user || !allowedRoles.includes(user.roleId)) {
    console.log("Access Denied: Role is", user?.roleId);
    redirect("/Unauthorized"); 
  }

  return <LayoutShell>{children}</LayoutShell>
}

