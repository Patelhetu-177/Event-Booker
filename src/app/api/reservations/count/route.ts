import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/next-auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const count = await prisma.reservation.count({
      where: {
        userId: session.user.id,
        status: 'Confirmed', 
      },
    });
    
    console.log(`Found ${count} reservations for user ${session.user.id}`);

    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error fetching reservation count:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reservation count' },
      { status: 500 }
    );
  }
}
