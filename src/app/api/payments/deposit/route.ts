import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    console.info("[TinyDiner] Square deposit intent", payload);
    return NextResponse.json({
      success: true,
      clientSecret: "mock_square_ach_token",
      message: "Square payment stub: connect to Square ACH/credit APIs here.",
    });
  } catch (error) {
    console.error("[TinyDiner] Square deposit intent failed", error);
    return NextResponse.json(
      { success: false, message: "Unable to create Square payment intent" },
      { status: 500 }
    );
  }
}
