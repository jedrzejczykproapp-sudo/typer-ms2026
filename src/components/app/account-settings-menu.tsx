"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Camera01, DotsVertical, Moon01, Sun, Trash01, X } from "@untitledui/icons";
import { useTheme } from "next-themes";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Input } from "@/components/base/input/input";
import { Avatar } from "@/components/base/avatar/avatar";
import { createClient } from "@/lib/supabase/client";
import { deleteAccount, signOut, updateProfile } from "@/actions/auth-actions";

// ─── Avatar crop picker (copied from group-settings-menu) ─────────────────────

const CROP_SIZE = 200;

export interface AvatarCropHandle {
    getCroppedBlob: () => Promise<Blob | null>;
    hasImage: () => boolean;
}

const AvatarCropPicker = forwardRef<AvatarCropHandle, { currentUrl: string | null }>(
    function AvatarCropPicker({ currentUrl }, ref) {
        const fileRef = useRef<HTMLInputElement>(null);
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const paintRef = useRef<(() => void) | null>(null);
        const imgEl = useRef<HTMLImageElement | null>(null);
        const natW = useRef(0);
        const natH = useRef(0);
        const sc = useRef(1);
        const baseSc = useRef(1);
        const ox = useRef(0);
        const oy = useRef(0);
        const [hasNew, setHasNew] = useState(false);

        useImperativeHandle(ref, () => ({
            getCroppedBlob: () => {
                const img = imgEl.current;
                if (!img) return Promise.resolve(null);
                return new Promise((resolve, reject) => {
                    const OUT = 400;
                    const out = document.createElement("canvas");
                    out.width = OUT;
                    out.height = OUT;
                    const s = sc.current;
                    const il = (CROP_SIZE - natW.current * s) / 2 + ox.current;
                    const it = (CROP_SIZE - natH.current * s) / 2 + oy.current;
                    out.getContext("2d")!.drawImage(img, -il / s, -it / s, CROP_SIZE / s, CROP_SIZE / s, 0, 0, OUT, OUT);
                    out.toBlob((b) => (b ? resolve(b) : reject()), "image/jpeg", 0.92);
                });
            },
            hasImage: () => imgEl.current !== null,
        }));

        useEffect(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const paint = () => {
                const img = imgEl.current;
                if (!img) return;
                const ctx = canvas.getContext("2d")!;
                const s = sc.current;
                ctx.clearRect(0, 0, CROP_SIZE, CROP_SIZE);
                ctx.drawImage(img, (CROP_SIZE - natW.current * s) / 2 + ox.current, (CROP_SIZE - natH.current * s) / 2 + oy.current, natW.current * s, natH.current * s);
            };
            paintRef.current = paint;
            let pid: number | null = null, lx = 0, ly = 0;
            const onDown = (e: PointerEvent) => { if (!imgEl.current) return; e.preventDefault(); pid = e.pointerId; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); };
            const onMove = (e: PointerEvent) => { if (e.pointerId !== pid) return; ox.current += e.clientX - lx; oy.current += e.clientY - ly; lx = e.clientX; ly = e.clientY; paint(); };
            const onUp = (e: PointerEvent) => { if (e.pointerId === pid) pid = null; };
            canvas.addEventListener("pointerdown", onDown);
            canvas.addEventListener("pointermove", onMove);
            canvas.addEventListener("pointerup", onUp);
            canvas.addEventListener("pointercancel", onUp);
            return () => { canvas.removeEventListener("pointerdown", onDown); canvas.removeEventListener("pointermove", onMove); canvas.removeEventListener("pointerup", onUp); canvas.removeEventListener("pointercancel", onUp); };
        }, []);

        function onFile(e: React.ChangeEvent<HTMLInputElement>) {
            const f = e.target.files?.[0];
            if (!f) return;
            const url = URL.createObjectURL(f);
            const img = new Image();
            img.onload = () => {
                imgEl.current = img; natW.current = img.naturalWidth; natH.current = img.naturalHeight;
                const s = Math.max(CROP_SIZE / natW.current, CROP_SIZE / natH.current);
                sc.current = s; baseSc.current = s; ox.current = 0; oy.current = 0;
                paintRef.current?.(); setHasNew(true);
            };
            img.src = url; e.target.value = "";
        }

        function onZoom(mult: number) { sc.current = baseSc.current * mult; paintRef.current?.(); }

        return (
            <div className="flex flex-col items-center gap-3">
                <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-secondary bg-secondary" style={{ width: CROP_SIZE, height: CROP_SIZE }}>
                    {!hasNew && currentUrl && <img src={currentUrl} alt="Avatar" className="absolute size-full object-cover" />}
                    {!hasNew && !currentUrl && (
                        <button type="button" onClick={() => fileRef.current?.click()} className="flex size-full items-center justify-center">
                            <Camera01 className="size-10 text-fg-quaternary" />
                        </button>
                    )}
                    <canvas ref={canvasRef} width={CROP_SIZE} height={CROP_SIZE} style={{ position: "absolute", inset: 0, width: CROP_SIZE, height: CROP_SIZE, cursor: hasNew ? "grab" : "default", touchAction: "none", display: hasNew ? "block" : "none" }} />
                </div>
                {hasNew && (
                    <>
                        <div className="flex w-full items-center gap-2 px-1">
                            <span className="text-xs text-tertiary">Zoom</span>
                            <input type="range" min={1} max={3} step={0.05} defaultValue={1} onChange={(e) => onZoom(Number(e.target.value))} className="flex-1" />
                        </div>
                        <p className="text-center text-xs text-tertiary">Przeciągnij aby ustawić kadr</p>
                    </>
                )}
                <button type="button" onClick={() => fileRef.current?.click()} className="rounded-lg border border-secondary px-3 py-1.5 text-xs font-medium text-secondary transition hover:bg-secondary">
                    {hasNew || currentUrl ? "Zmień zdjęcie" : "Wybierz zdjęcie"}
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
            </div>
        );
    },
);

// ─── Types ────────────────────────────────────────────────────────────────────

type Sheet = "options" | "edit" | "confirmDelete";

interface AccountSettingsMenuProps {
    displayName: string;
    avatarUrl: string | null;
    email: string;
    userId: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AccountSettingsMenu({ displayName, avatarUrl, email, userId }: AccountSettingsMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [sheet, setSheet] = useState<Sheet>("options");
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const cropRef = useRef<AvatarCropHandle>(null);
    const supabase = createClient();
    const { resolvedTheme, setTheme } = useTheme();

    const inits = displayName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

    function open() { setSheet("options"); setIsOpen(true); }
    function close() { setIsOpen(false); }
    function openEdit() { setSaveError(null); setSheet("edit"); }

    const backTarget: Partial<Record<Sheet, Sheet>> = {
        edit: "options",
        confirmDelete: "options",
    };

    async function handleSave(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaveError(null);
        setIsSaving(true);
        const fd = new FormData(e.currentTarget);
        let newAvatarUrl: string | null | undefined = undefined;

        if (cropRef.current?.hasImage()) {
            const blob = await cropRef.current.getCroppedBlob();
            if (blob) {
                const path = `avatars/${userId}/${Date.now()}.jpg`;
                const { data, error } = await supabase.storage
                    .from("group-avatars")
                    .upload(path, blob, { contentType: "image/jpeg", upsert: true });
                if (error) { setSaveError("Błąd wgrywania zdjęcia"); setIsSaving(false); return; }
                const { data: { publicUrl } } = supabase.storage.from("group-avatars").getPublicUrl(data.path);
                newAvatarUrl = publicUrl;
            }
        }

        const result = await updateProfile(fd.get("name") as string, newAvatarUrl);
        setIsSaving(false);
        if (result?.error) { setSaveError(result.error); }
        else { close(); }
    }

    async function handleDeleteAccount() {
        setIsDeleting(true);
        setDeleteError(null);
        const result = await deleteAccount();
        if (result?.error) { setDeleteError(result.error); setIsDeleting(false); }
    }

    const sheetTitles: Record<Sheet, string> = {
        options: "Moje konto",
        edit: "Edytuj profil",
        confirmDelete: "Usuń konto",
    };

    return (
        <>
            <ButtonUtility
                icon={DotsVertical}
                color="secondary"
                size="sm"
                tooltip="Ustawienia konta"
                onClick={open}
            />

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-50 bg-overlay/50" onClick={close} />

                    <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-2xl rounded-t-2xl bg-primary shadow-xl ring-1 ring-secondary">
                        {/* Header */}
                        <div className="flex items-center gap-2 border-b border-secondary px-4 py-3">
                            {backTarget[sheet] !== undefined && (
                                <button onClick={() => setSheet(backTarget[sheet]!)} className="flex items-center gap-1 rounded-lg p-1 text-tertiary hover:bg-secondary hover:text-secondary">
                                    <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                            )}
                            <span className="flex-1 text-sm font-semibold text-primary">{sheetTitles[sheet]}</span>
                            <button onClick={close} className="rounded-lg p-1.5 text-fg-quaternary hover:bg-secondary hover:text-fg-tertiary">
                                <X className="size-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="max-h-[70dvh] overflow-y-auto px-4 py-4 pb-8">
                            {sheet === "options" && (
                                <div className="flex flex-col">
                                    {/* Edit profile */}
                                    <button onClick={openEdit} className="flex items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-secondary">
                                        <svg className="size-5 shrink-0 text-fg-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                                        </svg>
                                        <p className="text-sm font-medium text-primary">Edytuj profil</p>
                                    </button>

                                    {/* Theme toggle */}
                                    <button
                                        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                                        className="flex items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-secondary"
                                    >
                                        {resolvedTheme === "dark"
                                            ? <Sun className="size-5 shrink-0 text-fg-tertiary" />
                                            : <Moon01 className="size-5 shrink-0 text-fg-tertiary" />
                                        }
                                        <p className="text-sm font-medium text-primary">
                                            {resolvedTheme === "dark" ? "Tryb jasny" : "Tryb ciemny"}
                                        </p>
                                    </button>

                                    <div className="my-1 border-t border-secondary" />

                                    {/* Sign out */}
                                    <form action={signOut}>
                                        <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-secondary">
                                            <svg className="size-5 shrink-0 text-fg-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                                            </svg>
                                            <p className="text-sm font-medium text-primary">Wyloguj się</p>
                                        </button>
                                    </form>

                                    <div className="my-1 border-t border-secondary" />

                                    {/* Delete account */}
                                    <button
                                        onClick={() => { setDeleteError(null); setSheet("confirmDelete"); }}
                                        className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-error-primary transition hover:bg-error-primary"
                                    >
                                        <Trash01 className="size-5 shrink-0" />
                                        <p className="text-sm font-medium">Usuń konto</p>
                                    </button>
                                </div>
                            )}

                            {sheet === "edit" && (
                                <form onSubmit={handleSave} className="flex flex-col gap-4">
                                    <AvatarCropPicker ref={cropRef} currentUrl={avatarUrl} />
                                    <Input name="name" label="Wyświetlana nazwa" defaultValue={displayName} isRequired />
                                    <div className="rounded-xl border border-secondary bg-secondary px-3 py-2.5">
                                        <p className="text-xs text-quaternary">E-mail</p>
                                        <p className="mt-0.5 text-sm text-primary">{email}</p>
                                    </div>
                                    {saveError && (
                                        <p className="rounded-lg bg-error-primary px-3 py-2 text-sm text-error-primary">{saveError}</p>
                                    )}
                                    <Button type="submit" isLoading={isSaving} showTextWhileLoading className="w-full">
                                        Zapisz
                                    </Button>
                                </form>
                            )}

                            {sheet === "confirmDelete" && (
                                <div className="flex flex-col gap-4">
                                    <div className="rounded-xl border border-error-primary bg-error-primary px-4 py-3">
                                        <p className="text-sm font-semibold text-error-primary">Tej operacji nie można cofnąć.</p>
                                        <p className="mt-1 text-sm text-error-secondary">
                                            Usunięcie konta spowoduje trwałe usunięcie wszystkich Twoich typowań i danych profilowych.
                                        </p>
                                    </div>
                                    {deleteError && (
                                        <p className="rounded-lg bg-error-primary px-3 py-2 text-sm text-error-primary">{deleteError}</p>
                                    )}
                                    <Button
                                        color="primary-destructive"
                                        className="w-full"
                                        isLoading={isDeleting}
                                        showTextWhileLoading
                                        onClick={handleDeleteAccount}
                                    >
                                        Tak, usuń konto
                                    </Button>
                                    <button
                                        onClick={() => setSheet("options")}
                                        disabled={isDeleting}
                                        className="w-full rounded-xl border border-secondary py-2.5 text-sm font-semibold text-secondary transition hover:bg-secondary disabled:opacity-40"
                                    >
                                        Anuluj
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
