import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();
    const correct = process.env.TEACHER_INVITE_CODE;
    if (!correct || !code || code.trim() !== correct.trim()) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
