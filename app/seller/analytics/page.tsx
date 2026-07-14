"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Analytics merged into the Dashboard — this route just forwards. */
export default function AnalyticsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/seller");
  }, [router]);
  return null;
}
