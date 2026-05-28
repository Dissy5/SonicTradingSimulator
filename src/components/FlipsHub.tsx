"use client";

import { useState } from "react";

import { FlipsList } from "@/components/FlipsList";
import { RecordFlipPurchase } from "@/components/RecordFlipPurchase";
import type { SkinCatalog } from "@/lib/types";

type FlipsHubProps = {
  catalog: SkinCatalog;
};

export function FlipsHub({ catalog }: FlipsHubProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-10">
      <RecordFlipPurchase
        catalog={catalog}
        onRecorded={() => setRefreshKey((value) => value + 1)}
      />
      <FlipsList catalog={catalog} refreshKey={refreshKey} />
    </div>
  );
}
