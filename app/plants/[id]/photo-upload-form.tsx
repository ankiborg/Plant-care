"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { uploadPhotoAction, UploadState } from "@/lib/actions";
import { MAX_PHOTO_MB, photoTooLargeMessage } from "@/lib/photo-limits";

export function PhotoUploadForm({ plantId }: { plantId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<UploadState>({ status: "idle" });

  function submit(formData: FormData) {
    const file = formData.get("photo");
    if (file instanceof File && file.size > MAX_PHOTO_MB * 1024 * 1024) {
      setState({ status: "error", message: photoTooLargeMessage(file.size) });
      return;
    }
    startTransition(async () => {
      const result = await uploadPhotoAction(formData);
      setState(result);
      if (result.status === "done") {
        formRef.current?.reset();
        router.refresh();
      }
    });
  }

  return (
    <form ref={formRef} action={submit} className="mb-4 space-y-2.5">
      <input type="hidden" name="plantId" value={plantId} />
      <input
        type="file"
        name="photo"
        accept="image/*"
        required
        className="block w-full text-sm text-[var(--color-muted)] file:mr-3 file:rounded-full file:border-0 file:bg-[var(--color-sage)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[var(--color-forest)]"
      />
      <div className="flex gap-2">
        <input
          name="note"
          maxLength={120}
          placeholder="Caption (optional)…"
          className="field"
        />
        <button type="submit" disabled={pending} className="btn btn-primary shrink-0">
          {pending ? "Uploading…" : "Upload"}
        </button>
      </div>
      {state.status === "error" && (
        <p className="text-sm text-[var(--color-clay)]">{state.message}</p>
      )}
      {state.status === "done" && (
        <p className="text-sm text-[var(--color-forest)]">Photo added. 🌿</p>
      )}
    </form>
  );
}
