import { NextResponse } from "next/server";
import { shouldRejectForModeration } from "../../_utils/moderationHelpers";

export async function POST(req) {
  try {
    const { fields = {}, dependants = [] } = await req.json();

    const moderationErrors = {};

    const fieldsToCheck = [
      "firstName",
      "lastName",
      "preferredName",
      "currentOrgInvolvement",
      "positionsHeld",
    ];

    for (const key of fieldsToCheck) {
      if (!fields[key]) continue;

      console.log("🔍 Checking field:", key, "value:", fields[key]);

      const result = await shouldRejectForModeration(key, fields[key]);

      console.log("🧠 Moderation result:", {
        key,
        scores: result.scores,
        matchedCategories: result.matchedCategories,
        shouldReject: result.shouldReject,
      });

      if (result.shouldReject) {
        moderationErrors[key] = result.reason;
      }
    }

    for (let i = 0; i < dependants.length; i++) {
      const dep = dependants[i];

      console.log("👶 Checking dependant:", i, dep);

      if (dep.firstName) {
        const firstNameCheck = await shouldRejectForModeration("firstName", dep.firstName);

        console.log("👶 First name result:", firstNameCheck);

        if (firstNameCheck.shouldReject) {
          moderationErrors[`dep_${i}_firstName`] = firstNameCheck.reason;
        }
      }

      if (dep.lastName) {
        const lastNameCheck = await shouldRejectForModeration("lastName", dep.lastName);

        console.log("👶 Last name result:", lastNameCheck);

        if (lastNameCheck.shouldReject) {
          moderationErrors[`dep_${i}_lastName`] = lastNameCheck.reason;
        }
      }
    }

    console.log("🚨 Final moderationErrors:", moderationErrors);

    return NextResponse.json({
      ok: true,
      moderationErrors,
    });
  } catch (error) {
    console.error("Moderation API error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Moderation check failed.",
      },
      { status: 500 }
    );
  }
}