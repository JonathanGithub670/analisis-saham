"use client";

import { useParams, useRouter } from "next/navigation";
import IdxStockDetail from "@/components/idx/IdxStockDetail";

export default function AnalisisDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawSymbol = (params.symbol as string || "").toUpperCase();

  // Convert slug to Yahoo Finance symbol: BBCA -> BBCA.JK
  const symbol = rawSymbol.includes(".") ? rawSymbol : `${rawSymbol}.JK`;

  return (
    <IdxStockDetail
      symbol={symbol}
      onBack={() => router.push("/analisis")}
    />
  );
}
