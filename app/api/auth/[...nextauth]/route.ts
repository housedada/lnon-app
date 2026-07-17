// app/api/auth/[...nextauth]/route.ts - Espone gli handler NextAuth v5
import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
