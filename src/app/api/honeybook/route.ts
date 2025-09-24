import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    console.info("[TinyDiner] HoneyBook sync payload", payload);
    return NextResponse.json({
      success: true,
      message: "HoneyBook sync stub: replace with HoneyBook API integration.",
    });
  } catch (error) {
    console.error("[TinyDiner] HoneyBook sync failed", error);
    return NextResponse.json(
      { success: false, message: "Unable to sync with HoneyBook" },
      { status: 500 }
    );
  }
}
