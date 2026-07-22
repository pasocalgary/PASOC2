"use client";
import React from "react";
import { Skeleton } from "@/app/_components/Skeleton";

export default function ReportSkeleton({ kpiCount = 3 }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: kpiCount }, (_, index) => (
          <div
            key={index}
            className="rounded-2xl border-2 border-[#556B2F]/20 bg-white px-6 py-5 flex flex-col gap-2"
          >
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      <div className="bg-white border-2 border-[#556B2F]/20 rounded-2xl p-6">
        <Skeleton className="h-5 w-40 mb-4" />
        <Skeleton className="h-70 w-full" />
      </div>

      <div className="bg-white border-2 border-[#556B2F]/20 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-[#556B2F]/10">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="flex flex-col gap-4 p-4">
          {[0, 1, 2, 3, 4].map((index) => (
            <Skeleton key={index} className="h-5 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
