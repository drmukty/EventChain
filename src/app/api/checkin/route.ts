import { NextRequest, NextResponse } from "next/server";
import { verifyAndConsumeQRCode } from "@/lib/qr";

// User‑friendly error messages for each failure reason
const REASON_MESSAGES: Record<string, string> = {
  MALFORMED: "QR code data is malformed or missing required fields",
  TAMPERED: "QR code signature is invalid – data may have been altered",
  EXPIRED: "This QR code has expired",
  ALREADY_USED: "This QR code has already been scanned",
  NOT_FOUND: "QR code not found in the system",
};

export async function POST(request: NextRequest) {
  try {
    // 1. Parse the request body
    const body = await request.json();
    const { payload } = body;

    if (!payload || typeof payload !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'payload' field" },
        { status: 400 }
      );
    }

    // 2. Verify and consume the QR code in one atomic operation
    const result = await verifyAndConsumeQRCode(payload);

    // 3. Handle verification/consumption failure
    if (!result.ok) {
      const message = REASON_MESSAGES[result.reason] ?? "Invalid QR code";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    // 4. Success – retrieve the verified application ID
    const applicationId = result.applicationId;

    // -----------------------------------------------------------------
    // YOUR BUSINESS LOGIC GOES HERE
    // Example: fetch the application, grant access, issue a token, etc.
    // -----------------------------------------------------------------
    // const application = await prisma.application.findUnique({
    //   where: { id: applicationId },
    // });
    // if (!application) {
    //   return NextResponse.json({ error: "Application not found" }, { status: 404 });
    // }

    // 5. Return success response
    return NextResponse.json({
      success: true,
      applicationId,
      // ... any additional data you want to send
    });
  } catch (error) {
    console.error("QR scan error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
