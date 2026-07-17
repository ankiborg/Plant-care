"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { uploadPhotoAction, UploadState } from "@/lib/actions";
import { prepareImageForUpload } from "@/lib/image-resize";
import { MAX_PHOTO_MB, photoTooLargeMessage } from "@/lib/photo-limits";

/**
 * Gallery upload with the same two-tap pattern as Identify: camera or
 * gallery button, upload starts as soon as a photo is picked. Type the
 * caption first — it's included with the photo.
 */
export function PhotoUploadForm({ plantId }: { plantId: string }) {
  const router = useRouter();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<UploadState>({ status: "idle" });

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    startTransition(async () => {
      // Oversized photos are downscaled in the browser instead of rejected.
      const prepared = await prepareImageForUpload(file);
      if (prepared.size > MAX_PHOTO_MB * 1024 * 1024) {
        setState({
          status: "error",
          message: photoTooLargeMessage(prepared.size),
        });
        return;
      }
      const fd = new FormData();
      fd.set("plantId", plantId);
      fd.set("photo", prepared);
      fd.set("note", noteRef.current?.value ?? "");
      const result = await uploadPhotoAction(fd);
      setState(result);
      if (result.status === "done") {
        if (noteRef.current) noteRef.current.value = "";
        router.refresh();
      }
    });
  }

  return (
    <div className="mb-4 space-y-2.5">
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onPick}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        onChange={onPick}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />

      <input
        ref={noteRef}
        maxLength={120}
        placeholder="Caption (optional)…"
        className="field"
      />
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          disabled={pending}
          className="btn btn-primary py-2.5"
        >
          {pending ? "Uploading…" : "📷 Take a photo"}
        </button>
        <button
          type="button"
          onClick={() => galleryRef.current?.click()}
          disabled={pending}
          className="btn btn-ghost py-2.5"
        >
          🖼️ Choose a photo
        </button>
      </div>

      {state.status === "error" && (
        <p className="text-sm text-[var(--color-clay)]">{state.message}</p>
      )}
      {state.status === "done" && (
        <p className="text-sm text-[var(--color-forest)]">Photo added. 🌿</p>
      )}
    </div>
  );
}
