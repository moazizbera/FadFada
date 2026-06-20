import crypto from "crypto";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

export const dynamic = "force-dynamic";

type AdminSessionUser = {
  id?: string;
  email?: string | null;
  role?: "USER" | "ADMIN";
};

type AuditSnapshot = {
  generatedAt: string;
  visitorsByRegion: Array<{ geographicRegion: string; count: number }>;
  registrationFunnel: Array<{
    id: string;
    name: string | null;
    email: string | null;
    provider: string;
    activeTier: string;
    tokenBalance: number;
    currentLanguage: string;
    createdAt: string;
  }>;
  commercialDistribution: Array<{
    tier: string;
    userCount: number;
    monthlyRevenueMinor: number;
    currency: string;
  }>;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
});

const providerLogos: Record<string, string> = {
  google: toDataImage('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.8-3.4-11.4-8.1L6 33c3.3 6.5 10.1 11 18 11z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>'),
  apple: toDataImage('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#F7F3EC" d="M31.9 25.3c0-4.2 3.4-6.2 3.6-6.3-2-2.9-5-3.3-6-3.4-2.6-.3-5 1.5-6.3 1.5s-3.3-1.5-5.4-1.4c-2.8 0-5.4 1.6-6.8 4.1-2.9 5-0.8 12.4 2.1 16.4 1.4 2 3 4.3 5.2 4.2 2.1-.1 2.9-1.3 5.4-1.3s3.2 1.3 5.4 1.3c2.2 0 3.7-2 5-4 1.6-2.3 2.2-4.5 2.2-4.6-.1 0-4.4-1.7-4.4-6.5zM27.8 12.9c1.1-1.3 1.8-3.1 1.6-4.9-1.5.1-3.3 1-4.4 2.3-1 1.1-1.9 3-1.6 4.7 1.6.1 3.3-.8 4.4-2.1z"/></svg>'),
  email: toDataImage('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="36" height="28" x="6" y="10" fill="none" stroke="#F7F3EC" stroke-width="4" rx="5"/><path fill="none" stroke="#C9A86A" stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="m9 15 15 12 15-12"/></svg>'),
};

function toDataImage(svg: string) {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function formatCurrencyFromMinorUnits(amount: number) {
  return currencyFormatter.format(amount / 100);
}

function getProviderLogo(provider: string) {
  return providerLogos[provider] || providerLogos.email;
}

function getAuditEncryptionKey() {
  return crypto.createHash("sha256").update(process.env.AUDIT_EXPORT_KEY || process.env.NEXTAUTH_SECRET || "fadfada-local-audit-key").digest();
}

function encryptAuditSnapshot(snapshot: AuditSnapshot) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getAuditEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(snapshot), "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    algorithm: "aes-256-gcm",
    generatedAt: snapshot.generatedAt,
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    payload: encrypted.toString("base64"),
  };
}

async function buildDashboardData() {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [visitorsByRegion, recentUsers, tierCounts, monthlyTransactions] = await Promise.all([
    prisma.visitorLog.groupBy({
      by: ["geographicRegion"],
      _count: { _all: true },
      orderBy: { _count: { geographicRegion: "desc" } },
      take: 8,
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 24,
      include: {
        accounts: {
          select: {
            provider: true,
          },
          take: 1,
        },
      },
    }),
    prisma.user.groupBy({
      by: ["activeTier"],
      _count: { _all: true },
    }),
    prisma.transaction.findMany({
      where: {
        status: "SUCCESSFUL",
        createdAt: {
          gte: monthStart,
        },
      },
      select: {
        amountPaid: true,
        currency: true,
        user: {
          select: {
            activeTier: true,
          },
        },
      },
    }),
  ]);

  const monthlyRevenueByTier = monthlyTransactions.reduce<Record<string, { amount: number; currency: string }>>((accumulator, transaction) => {
    const tier = transaction.user.activeTier;
    const current = accumulator[tier] || { amount: 0, currency: transaction.currency.toUpperCase() };
    accumulator[tier] = {
      amount: current.amount + transaction.amountPaid,
      currency: current.currency,
    };
    return accumulator;
  }, {});

  const distribution = ["FREE", "PLUS", "BUSINESS"].map((tier) => {
    const count = tierCounts.find((entry) => entry.activeTier === tier)?._count._all ?? 0;
    const monthlyRevenue = monthlyRevenueByTier[tier] || { amount: 0, currency: "USD" };
    return {
      tier,
      userCount: count,
      monthlyRevenueMinor: monthlyRevenue.amount,
      currency: monthlyRevenue.currency,
    };
  });

  const auditSnapshot: AuditSnapshot = {
    generatedAt: new Date().toISOString(),
    visitorsByRegion: visitorsByRegion.map((entry) => ({
      geographicRegion: entry.geographicRegion,
      count: entry._count._all,
    })),
    registrationFunnel: recentUsers.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      provider: user.accounts[0]?.provider || "email",
      activeTier: user.activeTier,
      tokenBalance: user.tokenBalance,
      currentLanguage: user.currentLanguage,
      createdAt: user.createdAt.toISOString(),
    })),
    commercialDistribution: distribution,
  };

  return {
    visitorsByRegion,
    recentUsers,
    distribution,
    auditSnapshot,
    encryptedAuditSnapshot: encryptAuditSnapshot(auditSnapshot),
  };
}

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as AdminSessionUser | undefined;

  if (!sessionUser) {
    redirect("/api/auth/signin?callbackUrl=/admin/dashboard");
  }

  if (sessionUser.role !== "ADMIN") {
    notFound();
  }

  const { visitorsByRegion, recentUsers, distribution, encryptedAuditSnapshot } = await buildDashboardData();
  const auditHref = `data:application/json;base64,${Buffer.from(JSON.stringify(encryptedAuditSnapshot, null, 2)).toString("base64")}`;

  return (
    <main className="min-h-screen bg-ink px-5 pb-14 pt-24 text-bone/90">
      <section className="mx-auto max-w-5xl">
        <div className="border-b border-white/10 pb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">Ad-op command center</p>
          <h1 className="mt-3 font-enserif text-5xl italic text-bone/95">FadFada operations</h1>
          <p className="mt-4 max-w-2xl font-ensans text-sm leading-7 text-bone/55">Private multi-tenant routing, visitor intelligence, registration quality, and commercial distribution metrics for the bilingual wellbeing workspace.</p>
        </div>

        <section className="grid gap-10 border-b border-white/10 py-10 md:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-bone/40">Total visitors ledger</p>
            <h2 className="mt-3 font-enserif text-3xl italic text-bone/90">Geographic origins</h2>
          </div>
          <div className="space-y-4">
            {visitorsByRegion.map((entry) => (
              <div key={entry.geographicRegion} className="grid grid-cols-[4rem_1fr_4rem] items-center gap-4 font-ensans text-sm text-bone/80">
                <span className="font-mono text-xs uppercase text-gold">{entry.geographicRegion}</span>
                <span className="h-px bg-white/10">
                  <span className="block h-px bg-gold/80" style={{ width: `${Math.min(100, entry._count._all * 12)}%` }} />
                </span>
                <span className="text-right font-mono text-bone/70">{entry._count._all}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-10 border-b border-white/10 py-10 md:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-bone/40">Registration funnel index</p>
            <h2 className="mt-3 font-enserif text-3xl italic text-bone/90">Recent active profiles</h2>
          </div>
          <div className="max-h-[28rem] space-y-4 overflow-y-auto pr-2 [scrollbar-color:rgba(201,168,106,0.45)_transparent]">
            {recentUsers.map((user) => {
              const provider = user.accounts[0]?.provider || "email";
              return (
                <div key={user.id} className="grid grid-cols-[2.25rem_1fr_auto] items-center gap-4 border-b border-white/10 pb-4">
                  <span className="relative h-9 w-9 overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-xl">
                    <Image src={getProviderLogo(provider)} alt={`${provider} provider`} fill sizes="36px" className="object-contain p-2" unoptimized />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-ensans text-sm text-bone/90">{user.name || user.email || "Unlabeled profile"}</span>
                    <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.08em] text-bone/35">{dateFormatter.format(user.createdAt)} · {user.currentLanguage.toUpperCase()}</span>
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-gold">{user.activeTier}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid gap-10 border-b border-white/10 py-10 md:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-bone/40">Commercial plan distribution matrix</p>
            <h2 className="mt-3 font-enserif text-3xl italic text-bone/90">Plan mix and monthly inflow</h2>
          </div>
          <div className="space-y-6">
            {distribution.map((entry) => (
              <div key={entry.tier} className="grid grid-cols-[5.5rem_1fr_auto] items-baseline gap-4">
                <span className="font-mono text-xs uppercase tracking-[0.12em] text-gold">{entry.tier}</span>
                <span className="font-ensans text-3xl text-bone/90">{entry.userCount} users</span>
                <span className="font-mono text-xs uppercase tracking-[0.08em] text-bone/50">{formatCurrencyFromMinorUnits(entry.monthlyRevenueMinor)} MRR</span>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-10 py-10 md:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-bone/40">Global JSON auditor</p>
            <h2 className="mt-3 font-enserif text-3xl italic text-bone/90">Encrypted XPRIZE snapshot</h2>
          </div>
          <div className="flex items-center justify-between gap-5 border-y border-white/10 py-5">
            <p className="max-w-md font-ensans text-sm leading-7 text-bone/55">Exports visitor, registration, and commercial distribution metrics as an AES-256-GCM encrypted JSON package for competition audit review.</p>
            <a href={auditHref} download="fadfada-audit-snapshot.encrypted.json" className="shrink-0 rounded-full border border-gold/40 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-gold transition-colors hover:bg-gold hover:text-ink">
              Export JSON
            </a>
          </div>
        </section>
      </section>
    </main>
  );
}
