import { PrismaClient } from "@prisma/client";

// Reuse a single PrismaClient across hot reloads in development, and construct
// it lazily on first use. Lazy construction keeps modules that only need the
// *pure* helpers (e.g. computeCredits, scoreMatch) importable without a live
// database/engine. which also makes those helpers unit-testable in isolation.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function create(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = create();
  return globalForPrisma.prisma;
}

// A proxy that defers client construction until a property is actually read.
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client as object, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
