import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Purchases, { PurchasesPackage, CustomerInfo, LOG_LEVEL } from "react-native-purchases";
import Constants from "expo-constants";

const REVENUECAT_API_KEY =
  Constants.expoConfig?.extra?.revenueCatApiKey ||
  process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ||
  "appl_BVVXQEBFhgNtNBvWEACExXHMPJc";
const PREMIUM_ENTITLEMENT_ID = "premium";
const FREE_WORDS_LIMIT = 50;
const DEBUG_OVERRIDE_KEY = "@chinese_master_debug_premium_override";

export type DebugPremiumOverride = "on" | "off" | null;

interface SubscriptionState {
  isPremium: boolean;
  loading: boolean;
}

interface SubscriptionContextType extends SubscriptionState {
  isGroupLocked: (groupIndex: number, hskLevel?: number) => boolean;
  isWordIndexLocked: (wordIndex: number, hskLevel?: number) => boolean;
  freeWordsLimit: number;
  isFreeLevel: (hskLevel: number) => boolean;
  restorePurchase: () => Promise<{ success: boolean; error?: string }>;
  purchaseSubscription: (pkg?: PurchasesPackage) => Promise<{ success: boolean; error?: string; cancelled?: boolean }>;
  availablePackages: PurchasesPackage[];
  currentOffering: string | null;
  initError: string | null;
  debugOverride: DebugPremiumOverride;
  setDebugOverride: (value: DebugPremiumOverride) => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  isPremium: false,
  loading: true,
  isGroupLocked: () => false,
  isWordIndexLocked: () => false,
  freeWordsLimit: FREE_WORDS_LIMIT,
  isFreeLevel: () => false,
  restorePurchase: async () => ({ success: false }),
  purchaseSubscription: async () => ({ success: false }),
  availablePackages: [],
  currentOffering: null,
  initError: null,
  debugOverride: null,
  setDebugOverride: async () => {},
});

export function useSubscription() {
  return useContext(SubscriptionContext);
}

async function checkPremiumStatus(customerInfo: CustomerInfo): Promise<boolean> {
  return typeof customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== "undefined";
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [revenueCatPremium, setRevenueCatPremium] = useState(false);
  const [debugOverride, setDebugOverrideState] = useState<DebugPremiumOverride>(null);
  const [loading, setLoading] = useState(true);
  const [availablePackages, setAvailablePackages] = useState<PurchasesPackage[]>([]);
  const [currentOffering, setCurrentOffering] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  const isPremium =
    debugOverride === "on" ? true : debugOverride === "off" ? false : revenueCatPremium;

  const setDebugOverride = useCallback(async (value: DebugPremiumOverride) => {
    setDebugOverrideState(value);
    try {
      if (value === null) {
        await AsyncStorage.removeItem(DEBUG_OVERRIDE_KEY);
      } else {
        await AsyncStorage.setItem(DEBUG_OVERRIDE_KEY, value);
      }
    } catch (e) {
      console.warn("[SubscriptionContext] Failed to persist debug override:", e);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(DEBUG_OVERRIDE_KEY);
        if (stored === "on" || stored === "off") {
          setDebugOverrideState(stored);
        }
      } catch (e) {
        console.warn("[SubscriptionContext] Failed to load debug override:", e);
      }
    })();
    initializeRevenueCat();
  }, []);

  const initializeRevenueCat = async () => {
    if (!REVENUECAT_API_KEY) {
      console.warn("[RevenueCat] API key not configured");
      setInitError("APIキーが設定されていません");
      setLoading(false);
      return;
    }

    try {
      console.log("[RevenueCat] Configuring with API key:", REVENUECAT_API_KEY.substring(0, 8) + "...");
      console.log("[RevenueCat] Platform:", Platform.OS);

      Purchases.configure({ apiKey: REVENUECAT_API_KEY });
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);

      console.log("[RevenueCat] Getting customer info...");
      const customerInfo = await Purchases.getCustomerInfo();
      const premium = await checkPremiumStatus(customerInfo);
      setRevenueCatPremium(premium);
      console.log("[RevenueCat] Premium status:", premium);
      console.log("[RevenueCat] Active entitlements:", Object.keys(customerInfo.entitlements.active));

      try {
        console.log("[RevenueCat] Loading offerings...");
        const offerings = await Purchases.getOfferings();
        console.log("[RevenueCat] Offerings loaded:", {
          current: offerings.current?.identifier || "none",
          allKeys: Object.keys(offerings.all),
          packageCount: offerings.current?.availablePackages.length || 0,
        });

        if (offerings.current && offerings.current.availablePackages.length > 0) {
          setAvailablePackages(offerings.current.availablePackages);
          setCurrentOffering(offerings.current.identifier);
          offerings.current.availablePackages.forEach((pkg, i) => {
            console.log(`[RevenueCat] Package ${i}:`, {
              type: pkg.packageType,
              identifier: pkg.identifier,
              productId: pkg.product?.identifier,
              price: pkg.product?.priceString,
            });
          });
        } else {
          console.warn("[RevenueCat] No packages available in current offering");
          const isExpoGo = Constants.appOwnership === "expo";
          if (!isExpoGo) {
            setInitError("商品情報が取得できません。RevenueCatダッシュボードの設定を確認してください。");
          }
        }
      } catch (offerError: any) {
        console.warn("[RevenueCat] Failed to load offerings:", offerError?.message || offerError);
        const isExpoGo = Constants.appOwnership === "expo";
        if (Platform.OS !== "web" && !isExpoGo) {
          setInitError(`オファリング取得エラー: ${offerError?.message || "不明なエラー"}`);
        }
      }

      Purchases.addCustomerInfoUpdateListener((info) => {
        checkPremiumStatus(info).then(setRevenueCatPremium);
      });
    } catch (e: any) {
      console.warn("[RevenueCat] Initialization failed:", e?.message || e);
      if (Platform.OS !== "web") {
        setInitError(`初期化エラー: ${e?.message || "不明なエラー"}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const isFreeLevel = useCallback(
    (hskLevel: number) => {
      return hskLevel === 1;
    },
    []
  );

  const isGroupLocked = useCallback(
    (_groupIndex: number, _hskLevel?: number) => {
      return false;
    },
    []
  );

  const isWordIndexLocked = useCallback(
    (wordIndex: number, hskLevel?: number) => {
      if (isPremium) return false;
      if (hskLevel !== undefined && isFreeLevel(hskLevel)) return false;
      return wordIndex >= FREE_WORDS_LIMIT;
    },
    [isPremium, isFreeLevel]
  );

  const purchaseSubscription = async (pkg?: PurchasesPackage): Promise<{ success: boolean; error?: string; cancelled?: boolean }> => {
    try {
      const packageToPurchase = pkg || availablePackages[0];
      if (!packageToPurchase) {
        const msg = "購入可能な商品がありません。RevenueCatダッシュボードでOffering・Product・Entitlementが正しく設定されているか確認してください。";
        console.warn("[RevenueCat] No package available for purchase");
        return { success: false, error: msg };
      }

      console.log("[RevenueCat] Purchasing package:", {
        type: packageToPurchase.packageType,
        productId: packageToPurchase.product?.identifier,
        price: packageToPurchase.product?.priceString,
      });

      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      const premium = await checkPremiumStatus(customerInfo);
      setRevenueCatPremium(premium);
      console.log("[RevenueCat] Purchase result - premium:", premium);
      return { success: premium };
    } catch (e: any) {
      if (e.userCancelled) {
        console.log("[RevenueCat] Purchase cancelled by user");
        return { success: false, cancelled: true };
      }
      const errorCode = e.code || "unknown";
      const errorMsg = e.message || e.readableErrorCode || "不明なエラー";
      console.warn("[RevenueCat] Purchase failed:", { code: errorCode, message: errorMsg, full: e });

      let userMessage = `購入エラー (${errorCode}): ${errorMsg}`;
      if (errorCode === "ProductNotAvailableForPurchaseError" || errorCode === "3") {
        userMessage = "この商品は現在購入できません。App Store Connectで商品が承認済みか確認してください。";
      } else if (errorCode === "StoreProblemError" || errorCode === "2") {
        userMessage = "ストアとの通信に問題があります。しばらく待ってからもう一度お試しください。";
      } else if (errorCode === "NetworkError" || errorCode === "1") {
        userMessage = "ネットワークエラーが発生しました。接続を確認してください。";
      } else if (errorCode === "PurchaseNotAllowedError" || errorCode === "5") {
        userMessage = "この端末では購入が許可されていません。設定を確認してください。";
      } else if (errorCode === "ConfigurationError" || errorCode === "23") {
        userMessage = "RevenueCatの設定に問題があります。ダッシュボードでProducts・Offerings・Entitlementsを確認してください。";
      }

      return { success: false, error: userMessage };
    }
  };

  const restorePurchase = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log("[RevenueCat] Restoring purchases...");
      const customerInfo = await Purchases.restorePurchases();
      const premium = await checkPremiumStatus(customerInfo);
      setRevenueCatPremium(premium);
      console.log("[RevenueCat] Restore result - premium:", premium);
      if (!premium) {
        return { success: false, error: "復元可能なサブスクリプションが見つかりませんでした。" };
      }
      return { success: true };
    } catch (e: any) {
      const errorMsg = e.message || "不明なエラー";
      console.warn("[RevenueCat] Restore failed:", errorMsg);
      return { success: false, error: `復元エラー: ${errorMsg}` };
    }
  };

  return (
    <SubscriptionContext.Provider
      value={{
        isPremium,
        loading,
        isGroupLocked,
        isWordIndexLocked,
        freeWordsLimit: FREE_WORDS_LIMIT,
        isFreeLevel,
        restorePurchase,
        purchaseSubscription,
        availablePackages,
        currentOffering,
        initError,
        debugOverride,
        setDebugOverride,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}
