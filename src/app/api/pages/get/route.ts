import { NextResponse } from "next/server";
import { getPageDbConnection, getPageModel } from "@/utils/db";

export async function GET(request: Request) {
  try {
    await getPageDbConnection();
    const Pages = getPageModel();

    const pages = await Pages.find();

    if (pages.length === 0) {
      return NextResponse.json({ message: "No Pages added" }, { status: 200 });
    }

    return NextResponse.json({ pages }, { status: 200 });
  } catch (error) {
    console.error("Error fetching pages:", error);
    return NextResponse.json(
      { error: "Error fetching pages" },
      { status: 500 }
    );
  }
}
