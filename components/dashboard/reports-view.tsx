"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function ReportsView() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Mes Rapports</h2>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau Rapport
        </Button>
      </div>
      <div className="grid gap-4">
        {/* Liste des rapports à implémenter */}
      </div>
    </div>
  );
}
