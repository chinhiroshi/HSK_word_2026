import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Purchases, { PurchasesPackage, CustomerInfo, LOG_LEVEL } from "react-native-purchases";
import Constants from "expo-constants";

const REVENUECAT_API_KEY =
  Constants.expoConfig?.extra?.revenueCatApiKey ||
  process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ||
  "";
const PREMIUM_ENTITLEMENT_ID = "premium";
const FREE_WORDS_LIMIT = 50;

interface SubscriptionState {
  isPremium: boolean;
  loading: boolean;
}

interface SubscriptionContextType extends SubscriptionState {
  isGroupLocked: (groupIndex: number) => boolean;
  isWordIndexLocked: (wordIndex: number) => boolean;
  freeWordsLimit: number;
  restorePurchase: () => Promise<boolean>;
  purchaseSubscription: (pkg?: PurchasesPackage) => Promise<boolean>;
  availablePackages: PurchasesPackage[];
  currentOffering: string | null;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  isPremium: false,
  loading: true,
  isGroupLocked: () => false,
  isWordIndexLocked: () => false,
  freeWordsLimit: FREE_WORDS_LIMIT,
  restorePurchase: async () => false,
  purchaseSubscription: async () => false,
  availablePackages: [],
  currentOffering: null,
});

export function useSubscription() {
  return useContext(SubscriptionContext);
}

async function checkPremiumStatus(customerInfo: CustomerInfo): Promise<boolean> {
  return typeof customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== "undefined";
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [availablePackages, setAvailablePackages] = useState<PurchasesPackage[]>([]);
  const [currentOffering, setCurrentOffering] = useState<string | null>(null);

  useEffect(() => {
    initializeRevenueCat();
  }, []);

  const initializeRevenueCat = async () => {
    if (!REVENUECAT_API_KEY) {
      console.warn("RevenueCat API key not configured");
      setLoading(false);
      return;
    }

    try {
      Purchases.configure({ apiKey: REVENUECAT_API_KEY });

      if (__DEV__) {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      }

      const customerInfo = await Purchases.getCustomerInfo();
      const premium = await checkPremiumStatus(customerInfo);
      setIsPremium(premium);

      try {
        const offerings = await Purchases.getOfferings();
        if (offerings.current && offerings.current.availablePackages.length > 0) {
          setAvailablePackages(offerings.current.availablePackages);
          setCurrentOffering(offerings.current.identifier);
        }
      } catch (offerError) {
        if (Platform.OS !== "web") {
          console.warn("Failed to load offerings:", offerError);
        }
      }

      Purchases.addCustomerInfoUpdateListener((info) => {
        checkPremiumStatus(info).then(setIsPremium);
      });
    } catch (e: any) {
      if (Platform.OS !== "web") {
        console.warn("RevenueCat initialization failed:", e);
      }
    } finally {
      setLoading(false);
    }
  };

  const isGroupLocked = useCallback(
    (groupIndex: number) => {
      if (isPremium) return false;
      return groupIndex > 0;
    },
    [isPremium]
  );

  const isWordIndexLocked = useCallback(
    (wordIndex: number) => {
      if (isPremium) return false;
      return wordIndex >= FREE_WORDS_LIMIT;
    },
    [isPremium]
  );

  const purchaseSubscription = async (pkg?: PurchasesPackage): Promise<boolean> => {
    try {
      const packageToPurchase = pkg || availablePackages[0];
      if (!packageToPurchase) {
        console.warn("No package available for purchase");
        return false;
      }

      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      const premium = await checkPremiumStatus(customerInfo);
      setIsPremium(premium);
      return premium;
    } catch (e: any) {
      if (!e.userCancelled) {
        console.warn("Purchase failed:", e);
      }
      return false;
    }
  };

  const restorePurchase = async (): Promise<boolean> => {
    try {
      const customerInfo = await Purchases.restorePurchases();
      const premium = await checkPremiumStatus(customerInfo);
      setIsPremium(premium);
      return premium;
    } catch (e) {
      console.warn("Restore failed:", e);
      return false;
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
        restorePurchase,
        purchaseSubscription,
        availablePackages,
        currentOffering,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}
