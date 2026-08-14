import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasEventAccess } from '@/lib/eventAccess';
import { createAuditLog } from '@/lib/audit';
import { rateLimit } from '@/lib/rateLimit';
import { stringify } from 'csv-stringify/sync';
import * as XLSX from 'xlsx';
import { PDFDocument, rgb } from 'pdf-lib';

type ReportRow = {
  'Attendee Name': string;
  'Email': string;
  'Wallet Address': string;
  'Application Status': string;
  'Attendance Status': string;
  'Check-in Time': string;
  'NFT Minted': string;
  'Certificate Issued': string;
  'Volunteer': string;
  'Application Motivation': string;
};

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const eventId = params.id;

  // 1. Authorization
  const hasAccess = await hasEventAccess(userId, eventId, ['OWNER', 'ADMIN']);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 2. Rate limiting (5 requests per 10 minutes)
  const { allowed } = rateLimit(userId);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a few minutes.' },
      { status: 429 }
    );
  }

  // 3. Parse query parameters
  const searchParams = req.nextUrl.searchParams;
  const format = searchParams.get('format') || 'csv';
  const filters = {
    status: searchParams.get('status') || undefined,
    checkedIn: searchParams.get('checkedIn') === 'true' ? true : searchParams.get('checkedIn') === 'false' ? false : undefined,
    walletConnected: searchParams.get('walletConnected') === 'true' ? true : searchParams.get('walletConnected') === 'false' ? false : undefined,
    volunteers: searchParams.get('volunteers') === 'true' ? true : searchParams.get('volunteers') === 'false' ? false : undefined,
    nftHolders: searchParams.get('nftHolders') === 'true' ? true : searchParams.get('nftHolders') === 'false' ? false : undefined,
  };

  // 4. Build query
  const where: any = { eventId };
  if (filters.status) {
    where.status = filters.status;
  }

  const applications = await prisma.application.findMany({
    where,
    include: {
      user: true,
      checkIn: {
        include: {
          nft: true,
          certificate: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // 5. Build report data
  const volunteerUserIds = new Set(
    (await prisma.teamMember.findMany({
      where: { eventId },
      select: { userId: true },
    })).map(t => t.userId)
  );

  const reportData: ReportRow[] = applications.map(app => {
    const walletConnected = !!app.user.walletAddress;
    const hasNft = !!(app.checkIn?.nft);
    const hasCertificate = !!(app.checkIn?.certificate);
    const checkedIn = !!app.checkIn;
    const isVolunteer = volunteerUserIds.has(app.userId);

    return {
      'Attendee Name': app.user.name || 'N/A',
      'Email': app.user.email,
      'Wallet Address': app.user.walletAddress || 'Not Connected',
      'Application Status': app.status,
      'Attendance Status': checkedIn ? 'Checked In' : 'Not Checked In',
      'Check-in Time': app.checkIn?.checkedInAt?.toISOString() || 'N/A',
      'NFT Minted': hasNft ? 'Yes' : 'No',
      'Certificate Issued': hasCertificate ? 'Yes' : 'No',
      'Volunteer': isVolunteer ? 'Yes' : 'No',
      'Application Motivation': app.answers ? JSON.stringify(app.answers) : 'N/A',
    };
  });

  // 6. Summary stats
  const total = applications.length;
  const approved = applications.filter(a => a.status === 'APPROVED').length;
  const rejected = applications.filter(a => a.status === 'REJECTED').length;
  const waitlisted = applications.filter(a => a.status === 'WAITLISTED').length;
  const checkedInCount = applications.filter(a => a.checkIn).length;
  const nftMinted = applications.filter(a => a.checkIn?.nft).length;
  const certificates = applications.filter(a => a.checkIn?.certificate).length;
  const walletConnectedCount = applications.filter(a => a.user.walletAddress).length;
  const attendanceRate = total > 0 ? Math.round((checkedInCount / approved) * 100) : 0;
  const walletRate = total > 0 ? Math.round((walletConnectedCount / total) * 100) : 0;

  // 7. Audit log
  await createAuditLog({
    userId,
    action: 'EXPORT_REPORT',
    resource: 'event',
    resourceId: eventId,
    metadata: { format, filters },
    ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
  });

  // 8. Generate export
  if (format === 'csv') {
    const csv = stringify(reportData, { header: true });
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename=event-report-${eventId}.csv`,
      },
    });
  }

  if (format === 'xlsx') {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(reportData);
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=event-report-${eventId}.xlsx`,
      },
    });
  }

  if (format === 'pdf') {
    const doc = await PDFDocument.create();
    const page = doc.addPage([595, 842]);
    const { height } = page.getSize();
    let y = height - 50;

    // Title
    page.drawText(`Event Report - ${eventId}`, {
      x: 50,
      y,
      size: 18,
      color: rgb(0, 0, 0),
    });
    y -= 30;

    // Summary stats
    const stats = [
      `Total Applications: ${total}`,
      `Approved: ${approved}`,
      `Rejected: ${rejected}`,
      `Waitlisted: ${waitlisted}`,
      `Checked In: ${checkedInCount}`,
      `NFT Minted: ${nftMinted}`,
      `Certificates: ${certificates}`,
      `Wallet Connected: ${walletConnectedCount}`,
      `Attendance Rate: ${attendanceRate}%`,
      `Wallet Rate: ${walletRate}%`,
    ];
    stats.forEach(line => {
      page.drawText(line, { x: 50, y, size: 10, color: rgb(0.2, 0.2, 0.2) });
      y -= 15;
    });
    y -= 20;

    // Table headers
    const headers = Object.keys(reportData[0] || {}) as (keyof ReportRow)[];
    const colWidth = 450 / headers.length;
    headers.forEach((h, i) => {
      page.drawText(String(h), {
        x: 50 + i * colWidth,
        y,
        size: 8,
        color: rgb(0, 0, 0),
      });
    });
    y -= 15;

    // Data rows (limit to 50 rows)
    const rows = reportData.slice(0, 50);
    rows.forEach(row => {
      const values = headers.map(h => String(row[h] || '').slice(0, 20));
      values.forEach((val, i) => {
        page.drawText(val, {
          x: 50 + i * colWidth,
          y,
          size: 7,
          color: rgb(0.2, 0.2, 0.2),
        });
      });
      y -= 12;
    });

    const pdfBytes = await doc.save();
    
    // Convert Uint8Array to Buffer for NextResponse
    const buffer = Buffer.from(pdfBytes);
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=event-report-${eventId}.pdf`,
      },
    });
  }

  return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
}
