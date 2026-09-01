import { NextResponse } from "next/server";
import { getJobsSummary } from "@/lib/queries/deploys";

export async function GET() {
  const jobs = await getJobsSummary();
  return NextResponse.json({ jobs });
}
