import { Capacitor, registerPlugin } from "@capacitor/core";

export type RevenueCatEntitlementInfo = {
  isActive: boolean;
  willRenew: boolean;
  productIdentifier: string;
  productPlanIdentifier: string | null;
  expirationDate: number | null;
};

export type RevenueCatCustomerInfo = {
  entitlements: Record<string, RevenueCatEntitlementInfo>;
  activeSubscriptions: string[];
  activeEntitlements: string[];
};

export type RevenueCatPackage = {
  identifier: string;
  packageType: string;
  offeringIdentifier: string;
  productId: string;
  title: string;
  type: string;
  priceFormatted: string;
  priceAmountMicros: number;
  currencyCode: string;
};

export type RevenueCatOffering = {
  identifier: string;
  serverDescription: string;
  availablePackages: RevenueCatPackage[];
};

export type RevenueCatOfferings = {
  current: RevenueCatOffering | null;
  all: Record<string, RevenueCatOffering>;
};

export type RevenueCatPurchaseResult = {
  customerInfo: RevenueCatCustomerInfo;
};

type RevenueCatPluginApi = {
  configure(options: { apiKey: string; userKey?: string }): Promise<{ ok: boolean; created?: boolean; customerInfo?: RevenueCatCustomerInfo }>;
  setUserId(options: { userKey: string }): Promise<{ ok: boolean }>;
  getOfferings(): Promise<RevenueCatOfferings>;
  purchase(options: { offeringIdentifier?: string; packageIdentifier: string }): Promise<RevenueCatPurchaseResult>;
  getCustomerInfo(): Promise<RevenueCatCustomerInfo>;
  restorePurchases(): Promise<RevenueCatCustomerInfo>;
};

let pluginProxy: RevenueCatPluginApi | null = null;

function getPlugin(): RevenueCatPluginApi {
  if (!pluginProxy) {
    pluginProxy = registerPlugin<RevenueCatPluginApi>("FadfadaRevenueCat");
  }
  return pluginProxy;
}

export function isRevenueCatAvailable(): boolean {
  return typeof window !== "undefined" && Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

export function getRevenueCatPublicApiKey(): string {
  return process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_API_KEY || "";
}

export async function configureRevenueCat(userKey?: string) {
  const apiKey = getRevenueCatPublicApiKey();
  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_REVENUECAT_ANDROID_API_KEY is not configured");
  }
  return getPlugin().configure({ apiKey, userKey });
}

export async function setRevenueCatUserId(userKey: string) {
  return getPlugin().setUserId({ userKey });
}

export async function fetchRevenueCatOfferings(): Promise<RevenueCatOfferings> {
  return getPlugin().getOfferings();
}

export async function purchaseRevenueCatPackage(offeringIdentifier: string | undefined, packageIdentifier: string) {
  return getPlugin().purchase({ offeringIdentifier, packageIdentifier });
}

export async function fetchRevenueCatCustomerInfo(): Promise<RevenueCatCustomerInfo> {
  return getPlugin().getCustomerInfo();
}

export async function restoreRevenueCatPurchases(): Promise<RevenueCatCustomerInfo> {
  return getPlugin().restorePurchases();
}

export function hasActiveRevenueCatEntitlement(customerInfo: RevenueCatCustomerInfo | null | undefined, entitlementId = "plus_access"): boolean {
  return Boolean(customerInfo?.entitlements?.[entitlementId]?.isActive);
}

export async function getFirstPurchaseablePackage() {
  const offerings = await fetchRevenueCatOfferings();
  const current = offerings.current ?? Object.values(offerings.all)[0] ?? null;
  const pkg = current?.availablePackages?.[0] ?? null;
  return { offering: current, pkg };
}
