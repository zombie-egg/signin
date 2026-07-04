import { Upload } from "lucide-react";
import { useState } from "react";

export function FileUploadBox({ accept, label, onFile }: { accept: string; label: string; onFile: (file: File) => void }) {
  const [name, setName] = useState("");
  return (
    <label className="newsprint-texture grid min-h-40 cursor-pointer place-items-center border-4 border-ink bg-paper p-6 text-center transition-all duration-200 ease-out hover:bg-divider/40">
      <input
        className="sr-only"
        type="file"
        accept={accept}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          setName(file.name);
          onFile(file);
        }}
      />
      <span className="grid gap-3">
        <Upload className="mx-auto" size={28} />
        <span className="font-display text-2xl font-black">{label}</span>
        <span className="meta-value">{name || accept.toUpperCase()}</span>
      </span>
    </label>
  );
}
