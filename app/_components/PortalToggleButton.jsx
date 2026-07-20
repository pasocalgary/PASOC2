"use client";

import { useRouter, usePathname } from "next/navigation";
import { useUserAuth } from "@/app/_utils/auth-context";

export default function PortalToggleButton() {
	const router = useRouter();
	const pathname = usePathname();

	// grabbing user + role from our auth context. user comes from Firebase, roleId comes from our DB
	const { user, roleId, loading } = useUserAuth();

	// only allow superadmin (1) and admin (2) to see this button
	const isAdmin = roleId == 1 || roleId == 2;

	// if auth is still loading OR user is not logged in OR not admin → hide button. this prevents flashing or showing it to the wrong users
	if (loading || !user || !isAdmin) return null;

	// checking if we are currently on the admin side (since all admin routes include things like "manager" or "dashboard") this was the easiest way to detect it without extra state
	const inAdminPortal =
		pathname.toLowerCase().includes("manager") ||
		pathname.toLowerCase().includes("dashboard") ||
		pathname.toLowerCase().includes("reports");

	const handleToggle = () => {
		// if already on admin side, goes to member side, otherwise; send back to admin dashboard
		if (inAdminPortal) {
			router.push("/");
		} else {
			router.push("/Dashboard");
		}
	};

	return (
		<button
			type="button"
			onClick={handleToggle}
			className={`shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-semibold shadow-sm transition ${
				inAdminPortal
					? "bg-white text-[#556B2F] hover:bg-gray-100"
					: "bg-[#556B2F] text-white hover:bg-[#445625]"
			}`}
		>
			{/* label also switches depending on current portal */}
			<span className="hidden sm:inline">{inAdminPortal ? "Switch to Member" : "Switch to Admin"}</span>
			<span className="sm:hidden">{inAdminPortal ? "Member" : "Admin"}</span>
		</button>
	);
}