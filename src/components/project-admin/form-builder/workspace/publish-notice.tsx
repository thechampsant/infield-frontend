"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { If2Toast } from "@/components/accounts/if2-toast";
import type { publishReceipt } from "@/lib/form-builder/publish-feedback";

type Receipt = ReturnType<typeof publishReceipt>;
const PublishNoticeContext = createContext<((receipt: Receipt) => void) | null>(null);

export function usePublishNotice() {
  const notify = useContext(PublishNoticeContext);
  if (!notify) throw new Error("Form Builder publish notices require the Form Builder layout.");
  return notify;
}

export function PublishNoticeProvider({ children }: { children: ReactNode }) {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const clear = useCallback(() => setReceipt(null), []);
  const onList = usePathname()?.replace(/\/$/, "").endsWith("/form-builder");
  return (
    <PublishNoticeContext.Provider value={setReceipt}>
      {onList && receipt && (receipt.warnings.length ? (
        <div className="pa-info-banner" role="status">
          <div>
            <strong>{receipt.summary}</strong>
            <ul>{receipt.warnings.map((message, index) => <li key={index}>{message}</li>)}</ul>
          </div>
          <button type="button" onClick={clear}>Dismiss</button>
        </div>
      ) : <If2Toast toast={{ type: "success", message: receipt.summary }} onDismiss={clear} />)}
      {children}
    </PublishNoticeContext.Provider>
  );
}
