"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CapData } from "@/lib/domain/types";
import { emptyCapData, getRepository, type Repository } from "@/lib/repo";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type Status = "loading" | "ready" | "error";

interface StoreValue {
  data: CapData;
  status: Status;
  repo: Repository;
  /** Exécute une écriture puis recharge les données. Relance l'erreur pour le toast. */
  run<T>(fn: (repo: Repository) => Promise<T>): Promise<T>;
  reload(): Promise<void>;
  supabase: boolean;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const repo = useMemo(() => getRepository(), []);
  const [data, setData] = useState<CapData>(emptyCapData);
  const [status, setStatus] = useState<Status>("loading");

  const reload = useCallback(async () => {
    try {
      setData(await repo.load());
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [repo]);

  useEffect(() => {
    let alive = true;
    repo
      .load()
      .then((d) => {
        if (!alive) return;
        setData(d);
        setStatus("ready");
      })
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
    };
  }, [repo]);

  const run = useCallback(
    async <T,>(fn: (r: Repository) => Promise<T>) => {
      const result = await fn(repo);
      setData(await repo.load());
      return result;
    },
    [repo],
  );

  const value = useMemo(
    () => ({ data, status, repo, run, reload, supabase: isSupabaseConfigured() }),
    [data, status, repo, run, reload],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const v = useContext(StoreContext);
  if (!v) throw new Error("useStore hors de StoreProvider");
  return v;
}
