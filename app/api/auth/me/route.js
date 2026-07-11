import pool from "@/lib/db";
import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";

const ROLES = {
	SUPERADMIN: 1,
	ADMIN: 2,
	MEMBER: 3,
	GUEST: 4,
};

// this route returns the currently logged-in user's info including their roleId from our database (not Firebase)
export async function GET(request) {
	try {
    // grab the Authorization header (should contain Bearer token)
		const authHeader = request.headers.get("authorization") || "";

    // extract the actual token from "Bearer <token>"
		const token = authHeader.startsWith("Bearer ")
			? authHeader.slice(7)
			: null;

    // if no token is provided, user is not authenticated
		if (!token) {
			return NextResponse.json(
				{ success: false, error: "Missing bearer token" },
				{ status: 401 }
			);
		}

    // verify the Firebase token using admin SDK. this gives us access to the decoded user info (like uid)
		const decoded = await getAdminAuth().verifyIdToken(token);

    // use the Firebase UID to look up the user in our DB, our app links Firebase users to MemberInfo via uuid
		const [rows] = await pool.query(
			`SELECT uuid, email, roleId, name
			 FROM MemberInfo
			 WHERE uuid = ?
			 LIMIT 1`,
			[decoded.uid]
		);

		const memberRow = rows[0] || null;

    // return a structured response with both Firebase + DB info
		return NextResponse.json({
			success: true,
			user: {
				firebaseUid: decoded.uid,
				email: decoded.email || memberRow?.email || null,
				roleId: memberRow?.roleId ?? ROLES.GUEST,
				name: memberRow?.name || null,
				memberExists: !!memberRow,
			},
		});
	} catch (error) {
		console.error("[GET /api/auth/me]", error);

		return NextResponse.json(
			{
				success: false,
				error: "Invalid or expired token",
			},
			{ status: 401 }
		);
	}
}