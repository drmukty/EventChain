import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { certificateId: string } }
) {
  try {
    const certificate = await prisma.certificate.findUnique({
      where: {
        certificateId: params.certificateId,
      },
      include: {
        user: true,
        event: true,
      },
    });

    if (!certificate) {
      return NextResponse.json(
        {
          valid: false,
          error: "Certificate not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      valid: true,
      certificate: {
        certificateId: certificate.certificateId,
        attendee: certificate.user.name ?? certificate.user.email,
        event: certificate.event.title,
        issuedAt: certificate.issuedAt,
        eventDate: certificate.event.startsAt,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        valid: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
