"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Panelist {
  id: string;
  name: string;
}

interface PanelistPickerProps {
  onSelect: (panelist: Panelist | null) => void;
  selected: Panelist | null;
}

export function PanelistPicker({ onSelect, selected }: PanelistPickerProps) {
  const [panelists, setPanelists] = useState<Panelist[]>([]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("panelists").select("id, name").order("name");
      if (data) setPanelists(data);
    }
    load();
  }, []);

  function handleChange(id: string) {
    if (id === "") {
      onSelect(null);
    } else {
      const p = panelists.find((x) => x.id === id) || null;
      onSelect(p);
    }
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-500">Reviewer:</span>
      <select
        value={selected?.id || ""}
        onChange={(e) => handleChange(e.target.value)}
        className={`border rounded px-2 py-1 text-sm ${selected ? "border-black font-medium" : "border-gray-300 text-gray-400"}`}
      >
        <option value="">Select your name</option>
        {panelists.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
    </div>
  );
}