import { useState } from "react";
import { Image, Loader2, UploadCloud, X } from "lucide-react";
import { supabase } from "../lib/supabase";

type LogoUploadProps = {
  userId: string;
  value: string;
  onChange: (url: string) => void;
};

export default function LogoUpload({
  userId,
  value,
  onChange,
}: LogoUploadProps) {
  const [uploading, setUploading] = useState(false);

  const uploadLogo = async (file: File) => {
    try {
      setUploading(true);

      if (!file.type.startsWith("image/")) {
        alert("Merci d’importer une image.");
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        alert("Logo trop lourd. Maximum 2 Mo.");
        return;
      }

      const extension = file.name.split(".").pop()?.toLowerCase() || "png";
      const filePath = `${userId}/logo-${Date.now()}.${extension}`;

      const { error } = await supabase.storage
        .from("logos")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) {
        console.error("Erreur upload logo:", error);
        alert(error.message);
        return;
      }

      const { data } = supabase.storage.from("logos").getPublicUrl(filePath);

      onChange(data.publicUrl);
    } catch (err) {
      console.error("Erreur inattendue upload logo:", err);
      alert("Erreur pendant l’import du logo.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition focus-within:border-violet-300 focus-within:ring-4 focus-within:ring-violet-100">
      <label className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
        <Image size={14} />
        Logo de votre entreprise
      </label>

      {value ? (
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            <img
              src={value}
              alt="Logo"
              className="h-full w-full object-contain"
            />
          </div>

          <div className="flex-1">
            <p className="text-sm font-black text-slate-900">Logo importé</p>
            <p className="mt-1 line-clamp-1 text-xs text-slate-500">{value}</p>

            <div className="mt-3 flex gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white transition hover:bg-black">
                {uploading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <UploadCloud size={14} />
                )}
                Changer
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadLogo(file);
                  }}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={() => onChange("")}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50"
              >
                <X size={14} />
                Retirer
              </button>
            </div>
          </div>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-violet-200 bg-violet-50/60 px-4 py-7 text-center transition hover:bg-violet-50">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-violet-700 shadow-sm">
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <UploadCloud className="h-5 w-5" />
            )}
          </div>

          <p className="text-sm font-black text-slate-900">
            Importer votre logo
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500">
            PNG, JPG, WEBP — maximum 2 Mo
          </p>

          <input
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadLogo(file);
            }}
            className="hidden"
          />
        </label>
      )}
    </div>
  );
}
