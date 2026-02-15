import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SUBSCRIPTION_KEY = "@chinese_master_subscription";
const FREE_WORDS_LIMIT = 50;

interface SubscriptionState {
  isPremium: boolean;
  loading: boolean;
}

interface SubscriptionContextType extends SubscriptionState {
  isGroupLocked: (groupIndex: number) => boolean;
  isWordIndexLocked: (wordIndex: number) => boolean;
  freeWordsLimit: number;
  restorePurchase: () => Promise<void>;
  purchaseSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  isPremium: false,
  loading: true,
  isGroupLocked: () => false,
  isWordIndexLocked: () => false,
  freeWordsLimit: FREE_WORDS_LIMIT,
  restorePurchase: async () => {},
  purchaseSubscription: async () => {},
});

export function useSubscription() {
  return useContext(SubscriptionContext);
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscriptionStatus();
  }, []);

  const loadSubscriptionStatus = async () => {
    try {
      const stored = await AsyncStorage.getItem(SUBSCRIPTION_KEY);
      if (stored === "true") {
        setIsPremium(true);
      }
      setLoading(false);
    } catch (e) {
      console.warn("Failed to load subscription status:", e);
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

  const purchaseSubscription = async () => {
    try {
      await AsyncStorage.setItem(SUBSCRIPTION_KEY, "true");
      setIsPremium(true);
    } catch (e) {
      console.warn("Purchase failed:", e);
    }
  };

  const restorePurchase = async () => {
    try {
      const stored = await AsyncStorage.getItem(SUBSCRIPTION_KEY);
      if (stored === "true") {
        setIsPremium(true);
      }
    } catch (e) {
      console.warn("Restore failed:", e);
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
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}
