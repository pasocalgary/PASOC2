export const dynamic = 'force-dynamic';

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import r2 from "@/lib/r2";
import pool from "@/lib/db";
import { getAdminAuth } from "@/lib/firebase-admin";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const ROLES = { SUPERADMIN: 1, ADMIN: 2 };

async function getAuthenticatedUser(request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return { error: NextResponse.json({ success: false, error: "Missing bearer token" }, { status: 401 }) };
  }
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const [rows] = await pool.query("SELECT roleId FROM MemberInfo WHERE uuid = ? LIMIT 1", [decoded.uid]);
    return { roleId: rows[0]?.roleId ?? 4 };
  } catch {
    return { error: NextResponse.json({ success: false, error: "Invalid or expired token" }, { status: 401 }) };
  }
}

function isAdmin(roleId) {
  const id = Number(roleId);
  return id === ROLES.ADMIN || id === ROLES.SUPERADMIN;
}

export async function POST(request) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (authResult.error) return authResult.error;
    if (!isAdmin(authResult.roleId)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { success: false, error: "Missing required field: file" },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { success: false, error: "File must be an image" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "Image must be under 5MB" },
        { status: 400 }
      );
    }

    const extension = file.name.includes(".") ? file.name.split(".").pop() : "";
    const key = `sponsors/${uuidv4()}${extension ? `.${extension}` : ""}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_SPONSORS_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      })
    );

    return NextResponse.json({
      success: true,
      url: `${process.env.R2_SPONSORS_PUBLIC_URL}/${key}`,
    });
  } catch (err) {
    console.error("[POST /api/sponsors/upload]", err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
