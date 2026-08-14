import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { rateLimit } from '@/lib/rateLimit';
import { stringify } from 'csv-stringify/sync';

type ReportRow = {
  'Attendee Name': string;
  'Wallet Address': string;
  'Application Status': string;
  'Attendance Status': string;
  'Check-in Time': string;
  'NFT Minted': string;
  'Certificate Issued': string;
  'Volunteer': string;
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

  // 1. Check if event exists
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { organizerId: true, title: true, status: true },
  });
  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  // 2. Authorization
  const isAdmin = (session.user as any).role === 'ADMIN';
  const isOrganizer = event.organizerId === userId;

  let isTeamAdmin = false;
  if (!isAdmin && !isOrganizer) {
    const membership = await prisma.teamMember.findUnique({
      where: { eventId_userId: { eventId, userId } },
      select: { role: true },
    });
    isTeamAdmin = membership?.role === 'OWNER' || membership?.role === 'ADMIN';
  }

  if (!isAdmin && !isOrganizer && !isTeamAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 3. Rate limiting
  const { allowed } = rateLimit(userId);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a few minutes.' },
      { status: 429 }
    );
  }

  // 4. Parse filters
  const searchParams = req.nextUrl.searchParams;
  const filters = {
    status: searchParams.get('status') || undefined,
    checkedIn: searchParams.get('checkedIn') === 'true' ? true : searchParams.get('checkedIn') === 'false' ? false : undefined,
    walletConnected: searchParams.get('walletConnected') === 'true' ? true : searchParams.get('walletConnected') === 'false' ? false : undefined,
    volunteers: searchParams.get('volunteers') === 'true' ? true : searchParams.get('volunteers') === 'false' ? false : undefined,
    nftHolders: searchParams.get('nftHolders') === 'true' ? true : searchParams.get('nftHolders') === 'false' ? false : undefined,
  };

  // 5. Build query
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

  // 6. Get volunteers
  const volunteerUserIds = new Set(
    (await prisma.teamMember.findMany({
      where: { eventId },
      select: { userId: true },
    })).map(t => t.userId)
  );

  // 7. Build report data
  const reportData: ReportRow[] = applications.map(app => {
    const hasNft = !!(app.checkIn?.nft);
    const hasCertificate = !!(app.checkIn?.certificate);
    const checkedIn = !!app.checkIn;
    const isVolunteer = volunteerUserIds.has(app.userId);

    // Get wallet address from multiple sources
    let walletAddress = 'Not Connected';
    
    // First check if user has wallet address
    if (app.user.walletAddress) {
      walletAddress = app.user.walletAddress;
    } 
    // If not, check if NFT has contract address (this means they minted)
    else if (app.checkIn?.nft?.contractAddr) {
      // If they have an NFT, they must have connected a wallet
      // We'll mark it as "Connected (NFT Minted)" to indicate they had a wallet
      walletAddress = 'Connected (NFT Minted)';
    }
    // If they have a check-in but no wallet, they might have used QR
    else if (app.checkIn) {
      walletAddress = 'Not Connected';
    }

    return {
      'Attendee Name': app.user.name || 'N/A',
      'Wallet Address': walletAddress,
      'Application Status': app.status,
      'Attendance Status': checkedIn ? 'Checked In' : 'Not Checked In',
      'Check-in Time': app.checkIn?.checkedInAt?.toISOString() || 'N/A',
      'NFT Minted': hasNft ? 'Yes' : 'No',
      'Certificate Issued': hasCertificate ? 'Yes' : 'No',
      'Volunteer': isVolunteer ? 'Yes' : 'No',
    };
  });

  // 8. Audit log
  await createAuditLog({
    userId,
    action: 'EXPORT_REPORT',
    resource: 'event',
    resourceId: eventId,
    metadata: { format: 'csv', filters, eventTitle: event.title, eventStatus: event.status },
    ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
  });

  // 9. Generate CSV
  const csv = stringify(reportData, { header: true });
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename=event-report-${eventId}.csv`,
    },
  });
}
