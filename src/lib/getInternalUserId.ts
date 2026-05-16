import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';

export async function getInternalUserId(): Promise<string> {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect('/');

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!user) throw new Error('User record not found for clerkId: ' + clerkId);
  return user.id;
}
