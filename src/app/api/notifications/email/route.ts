import { NextResponse } from "next/server";

type EmailPayload = {
  requestId: string;
  to: string;
  subject: string;
  message: string;
  sentBy: string;
  estimateSummary?: unknown;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as EmailPayload;

    console.info("[TinyDiner] Email dispatch stub", {
      ...payload,
      messageLength: payload.message.length,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[TinyDiner] Email dispatch failed", error);
    return NextResponse.json(
      { success: false, message: "Unable to dispatch email notification" },
      { status: 500 }
    );
  }
}
