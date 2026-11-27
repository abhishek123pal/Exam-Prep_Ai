// backend/src/lib/prisma.ts

import { PrismaClient } from '@prisma/client';

// TypeScript global object declaration for Prisma
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Export a single, reusable Prisma instance
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// Prevent multiple instances in development during hot-reloads
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;