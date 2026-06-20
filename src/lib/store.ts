export type UserAccount = {
  userId: string;
  remainingTokens: number;
  totalPurchased: number;
  updatedAt: string;
};

const accounts = new Map<string, UserAccount>();

export function getOrCreateUser(userId: string) {
  const existing = accounts.get(userId);
  if (existing) return existing;

  const account: UserAccount = {
    userId,
    remainingTokens: 3,
    totalPurchased: 0,
    updatedAt: new Date().toISOString(),
  };
  accounts.set(userId, account);
  return account;
}

export function consumeToken(userId: string) {
  const account = getOrCreateUser(userId);
  if (account.remainingTokens <= 0) return false;

  account.remainingTokens -= 1;
  account.updatedAt = new Date().toISOString();
  accounts.set(userId, account);
  return true;
}

export function addTokens(userId: string, count: number) {
  const account = getOrCreateUser(userId);
  account.remainingTokens += count;
  account.totalPurchased += count;
  account.updatedAt = new Date().toISOString();
  accounts.set(userId, account);
  return account;
}

export function getLedgerSnapshot() {
  return Array.from(accounts.values());
}
