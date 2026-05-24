"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Camera01, Check, ChevronLeft, Copy01, DotsVertical, Edit01, LogOut01, Share01, Trash01, Users01, X } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Input } from "@/components/base/input/input";
import { Avatar } from "@/components/base/avatar/avatar";
import { useClipboard } from "@/hooks/use-clipboard";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { deleteGroup, getGroupMembers, leaveGroup, removeMember, renameGroup } from "@/actions/group-actions";
import { cx } from "@/utils/cx";

// ─── Avatar crop picker ───────────────────────────────────────────────────────

const CROP_SIZE = 200;

export interface AvatarCropHandle {
    getCroppedBlob: () => Promise<Blob | null>;
    hasImage: () => boolean;
}

export const AvatarCropPicker = forwardRef<AvatarCropHandle, { currentUrl: string | null }>(
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
                ctx.drawImage(
                    img,
                    (CROP_SIZE - natW.current * s) / 2 + ox.current,
                    (CROP_SIZE - natH.current * s) / 2 + oy.current,
                    natW.current * s,
                    natH.current * s,
                );
            };
            paintRef.current = paint;

            let pid: number | null = null;
            let lx = 0,
                ly = 0;

            const onDown = (e: PointerEvent) => {
                if (!imgEl.current) return;
                e.preventDefault();
                pid = e.pointerId;
                lx = e.clientX;
                ly = e.clientY;
                canvas.setPointerCapture(e.pointerId);
            };
            const onMove = (e: PointerEvent) => {
                if (e.pointerId !== pid) return;
                ox.current += e.clientX - lx;
                oy.current += e.clientY - ly;
                lx = e.clientX;
                ly = e.clientY;
                paint();
            };
            const onUp = (e: PointerEvent) => {
                if (e.pointerId === pid) pid = null;
            };

            canvas.addEventListener("pointerdown", onDown);
            canvas.addEventListener("pointermove", onMove);
            canvas.addEventListener("pointerup", onUp);
            canvas.addEventListener("pointercancel", onUp);
            return () => {
                canvas.removeEventListener("pointerdown", onDown);
                canvas.removeEventListener("pointermove", onMove);
                canvas.removeEventListener("pointerup", onUp);
                canvas.removeEventListener("pointercancel", onUp);
            };
        }, []);

        function onFile(e: React.ChangeEvent<HTMLInputElement>) {
            const f = e.target.files?.[0];
            if (!f) return;
            const url = URL.createObjectURL(f);
            const img = new Image();
            img.onload = () => {
                imgEl.current = img;
                natW.current = img.naturalWidth;
                natH.current = img.naturalHeight;
                const s = Math.max(CROP_SIZE / natW.current, CROP_SIZE / natH.current);
                sc.current = s;
                baseSc.current = s;
                ox.current = 0;
                oy.current = 0;
                paintRef.current?.();
                setHasNew(true);
            };
            img.src = url;
            e.target.value = "";
        }

        function onZoom(mult: number) {
            sc.current = baseSc.current * mult;
            paintRef.current?.();
        }

        return (
            <div className="flex flex-col items-center gap-3">
                <div
                    className="relative overflow-hidden rounded-2xl border-2 border-dashed border-secondary bg-secondary"
                    style={{ width: CROP_SIZE, height: CROP_SIZE }}
                >
                    {!hasNew && currentUrl && (
                        <img src={currentUrl} alt="Avatar" className="absolute size-full object-cover" />
                    )}
                    {!hasNew && !currentUrl && (
                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            className="flex size-full items-center justify-center"
                        >
                            <Camera01 className="size-10 text-fg-quaternary" />
                        </button>
                    )}
                    <canvas
                        ref={canvasRef}
                        width={CROP_SIZE}
                        height={CROP_SIZE}
                        style={{
                            position: "absolute",
                            inset: 0,
                            width: CROP_SIZE,
                            height: CROP_SIZE,
                            cursor: hasNew ? "grab" : "default",
                            touchAction: "none",
                            display: hasNew ? "block" : "none",
                        }}
                    />
                </div>

                {hasNew && (
                    <>
                        <div className="flex w-full items-center gap-2 px-1">
                            <span className="text-xs text-tertiary">Zoom</span>
                            <input
                                type="range"
                                min={1}
                                max={3}
                                step={0.05}
                                defaultValue={1}
                                onChange={(e) => onZoom(Number(e.target.value))}
                                className="flex-1"
                            />
                        </div>
                        <p className="text-center text-xs text-tertiary">Przeciągnij aby ustawić kadr</p>
                    </>
                )}

                <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="rounded-lg border border-secondary px-3 py-1.5 text-xs font-medium text-secondary transition hover:bg-secondary"
                >
                    {hasNew || currentUrl ? "Zmień zdjęcie" : "Wybierz zdjęcie"}
                </button>

                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
            </div>
        );
    },
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
    user_id: string;
    joined_at: string;
    profiles: { id: string; display_name: string | null; avatar_url: string | null } | null;
}

interface GroupSettingsMenuProps {
    groupId: string;
    inviteCode: string;
    groupName: string;
    currentAvatarUrl: string | null;
    isAdmin: boolean;
    currentUserId: string;
    createdBy: string;
}

type Sheet = "options" | "edit" | "members" | "confirmDelete" | "confirmLeave";

function initials(name: string | null) {
    return (name ?? "?")
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

// ─── Component ───────────────────────────────────────────────────────────────

export function GroupSettingsMenu({
    groupId,
    inviteCode,
    groupName,
    currentAvatarUrl,
    isAdmin,
    currentUserId,
    createdBy,
}: GroupSettingsMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [sheet, setSheet] = useState<Sheet>("options");
    const [members, setMembers] = useState<Member[]>([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const cropRef = useRef<AvatarCropHandle>(null);
    const clipboard = useClipboard();
    const router = useRouter();
    const supabase = createClient();

    function openSheet() {
        setSheet("options");
        setIsOpen(true);
    }

    function close() {
        setIsOpen(false);
    }

    function openEdit() {
        setSaveError(null);
        setSheet("edit");
    }

    async function openMembers() {
        setSheet("members");
        setMembersLoading(true);
        const data = await getGroupMembers(groupId);
        setMembers(data as unknown as Member[]);
        setMembersLoading(false);
    }

    async function handleSave(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaveError(null);
        setIsSaving(true);

        const fd = new FormData(e.currentTarget);
        let avatarUrl: string | null | undefined = undefined;

        if (cropRef.current?.hasImage()) {
            const blob = await cropRef.current.getCroppedBlob();
            if (blob) {
                const path = `${groupId}/${Date.now()}.jpg`;
                const { data, error } = await supabase.storage
                    .from("group-avatars")
                    .upload(path, blob, { contentType: "image/jpeg", upsert: true });
                if (error) {
                    setSaveError("Błąd wgrywania zdjęcia");
                    setIsSaving(false);
                    return;
                }
                const { data: { publicUrl } } = supabase.storage.from("group-avatars").getPublicUrl(data.path);
                avatarUrl = publicUrl;
            }
        }

        const result = await renameGroup(groupId, fd.get("name") as string, avatarUrl);
        setIsSaving(false);
        if (result?.error) {
            setSaveError(result.error);
        } else {
            close();
        }
    }

    async function handleRemoveMember(memberId: string) {
        setRemovingId(memberId);
        const result = await removeMember(groupId, memberId);
        if (!result?.error) {
            setMembers((prev) => prev.filter((m) => m.user_id !== memberId));
            setConfirmRemoveId(null);
        }
        setRemovingId(null);
    }

    async function handleDeleteGroup() {
        setIsDeleting(true);
        setActionError(null);
        const result = await deleteGroup(groupId);
        // On success the server action redirects — we only land here on error
        setIsDeleting(false);
        if (result?.error) setActionError(result.error);
    }

    async function handleLeaveGroup() {
        setIsLeaving(true);
        setActionError(null);
        const result = await leaveGroup(groupId);
        // On success the server action redirects — we only land here on error
        setIsLeaving(false);
        if (result?.error) setActionError(result.error);
    }

    const sheetTitles: Record<Sheet, string> = {
        options: "Ustawienia grupy",
        edit: "Edytuj grupę",
        members: "Członkowie",
        confirmDelete: "Usuń grupę",
        confirmLeave: "Opuść grupę",
    };

    return (
        <>
            <ButtonUtility
                icon={DotsVertical}
                color="secondary"
                size="sm"
                tooltip="Ustawienia grupy"
                onClick={openSheet}
            />

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-50 bg-overlay/50" onClick={close} />

                    <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-2xl rounded-t-2xl bg-primary shadow-xl ring-1 ring-secondary">
                        <div className="flex items-center gap-2 border-b border-secondary px-4 py-3">
                            {sheet !== "options" && (
                                <button
                                    onClick={() => setSheet("options")}
                                    className="flex items-center gap-1 rounded-lg p-1 text-tertiary hover:bg-secondary hover:text-secondary"
                                >
                                    <ChevronLeft className="size-6" />
                                </button>
                            )}
                            <span className="flex-1 text-sm font-semibold text-primary">{sheetTitles[sheet]}</span>
                            <button
                                onClick={close}
                                className="rounded-lg p-1.5 text-fg-quaternary hover:bg-secondary hover:text-fg-tertiary"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <div className="max-h-[70dvh] overflow-y-auto px-4 py-4 pb-8">
                            {sheet === "options" && (
                                <div className="flex flex-col">
                                    {/* Share */}
                                    <button
                                        onClick={async () => {
                                            const url = `${window.location.origin}/dolacz?kod=${inviteCode}`;
                                            const text = `Dołącz do mojej grupy „${groupName}" na Typerek!\n${url}`;
                                            if (typeof navigator.share === "function") {
                                                try { await navigator.share({ title: "Typerek", text, url }); } catch { /* dismissed */ }
                                            } else {
                                                clipboard.copy(url);
                                            }
                                        }}
                                        className="flex items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-secondary"
                                    >
                                        <Share01 className="size-5 shrink-0 text-fg-tertiary" />
                                        <p className="text-sm font-medium text-primary">Zaproś</p>
                                    </button>

                                    {/* Copy invite code */}
                                    <button
                                        onClick={() => clipboard.copy(inviteCode)}
                                        className="flex items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-secondary"
                                    >
                                        {clipboard.copied ? (
                                            <Check className="size-5 shrink-0 text-success-primary" />
                                        ) : (
                                            <Copy01 className="size-5 shrink-0 text-fg-tertiary" />
                                        )}
                                        <div>
                                            <p className="text-sm font-medium text-primary">
                                                {clipboard.copied ? "Skopiowano!" : "Skopiuj kod zaproszenia"}
                                            </p>
                                            <p className="font-mono text-xs tracking-widest text-tertiary">{inviteCode}</p>
                                        </div>
                                    </button>

                                    {isAdmin && (
                                        <button
                                            onClick={openEdit}
                                            className="flex items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-secondary"
                                        >
                                            <Edit01 className="size-5 shrink-0 text-fg-tertiary" />
                                            <p className="text-sm font-medium text-primary">Edytuj grupę</p>
                                        </button>
                                    )}

                                    <button
                                        onClick={openMembers}
                                        className="flex items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-secondary"
                                    >
                                        <Users01 className="size-5 shrink-0 text-fg-tertiary" />
                                        <p className="text-sm font-medium text-primary">Członkowie grupy</p>
                                    </button>

                                    <div className="my-1 border-t border-secondary" />

                                    {!isAdmin && (
                                        <button
                                            onClick={() => { setActionError(null); setSheet("confirmLeave"); }}
                                            className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-error-primary transition hover:bg-error-primary"
                                        >
                                            <LogOut01 className="size-5 shrink-0" />
                                            <p className="text-sm font-medium">Opuść grupę</p>
                                        </button>
                                    )}

                                    {isAdmin && (
                                        <button
                                            onClick={() => { setActionError(null); setSheet("confirmDelete"); }}
                                            className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-error-primary transition hover:bg-error-primary"
                                        >
                                            <Trash01 className="size-5 shrink-0" />
                                            <p className="text-sm font-medium">Usuń grupę</p>
                                        </button>
                                    )}
                                </div>
                            )}

                            {sheet === "edit" && (
                                <form onSubmit={handleSave} className="flex flex-col gap-4">
                                    <AvatarCropPicker ref={cropRef} currentUrl={currentAvatarUrl} />
                                    <Input name="name" label="Nazwa grupy" defaultValue={groupName} isRequired />
                                    {saveError && (
                                        <p className="rounded-lg bg-error-primary px-3 py-2 text-sm text-error-primary">
                                            {saveError}
                                        </p>
                                    )}
                                    <Button type="submit" isLoading={isSaving} showTextWhileLoading className="w-full">
                                        Zapisz
                                    </Button>
                                </form>
                            )}

                            {sheet === "members" && (
                                <div className="flex flex-col gap-1">
                                    {membersLoading ? (
                                        <p className="py-6 text-center text-sm text-tertiary">Ładowanie...</p>
                                    ) : (
                                        members.map((member) => {
                                            const name = (member.profiles as any)?.display_name ?? "Anonim";
                                            const isCreator = member.user_id === createdBy;
                                            const isMe = member.user_id === currentUserId;
                                            const canRemove = isAdmin && !isCreator && !isMe;
                                            const isPendingConfirm = confirmRemoveId === member.user_id;
                                            const isRemoving = removingId === member.user_id;

                                            // ── Inline confirmation row ──
                                            if (isPendingConfirm) {
                                                return (
                                                    <div
                                                        key={member.user_id}
                                                        className="flex items-center gap-3 rounded-xl border border-error-primary bg-error-primary px-3 py-2.5"
                                                    >
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-medium text-error-primary">
                                                                Usunąć {name} z grupy?
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => setConfirmRemoveId(null)}
                                                                disabled={isRemoving}
                                                                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-tertiary transition hover:bg-secondary disabled:opacity-40"
                                                            >
                                                                Anuluj
                                                            </button>
                                                            <button
                                                                onClick={() => handleRemoveMember(member.user_id)}
                                                                disabled={isRemoving}
                                                                className="rounded-lg bg-error-solid px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                                                            >
                                                                {isRemoving ? "Usuwanie…" : "Usuń"}
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            // ── Normal member row ──
                                            return (
                                                <div key={member.user_id} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
                                                    <Avatar initials={initials(name)} src={(member.profiles as any)?.avatar_url ?? undefined} size="sm" />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-medium text-primary">
                                                            {name}
                                                            {isMe && <span className="ml-1 text-xs text-tertiary">(Ty)</span>}
                                                        </p>
                                                        {isCreator && (
                                                            <p className="text-xs font-semibold text-brand-secondary">Admin</p>
                                                        )}
                                                    </div>
                                                    {canRemove && (
                                                        <button
                                                            onClick={() => setConfirmRemoveId(member.user_id)}
                                                            className={cx(
                                                                "rounded-lg p-2 text-fg-quaternary transition",
                                                                "hover:bg-error-primary hover:text-error-primary",
                                                            )}
                                                            aria-label={`Usuń ${name}`}
                                                        >
                                                            <Trash01 className="size-5" />
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                            {sheet === "confirmDelete" && (
                                <div className="flex flex-col gap-4">
                                    <div className="rounded-xl border border-error-primary bg-error-primary px-4 py-3">
                                        <p className="text-sm font-semibold text-error-primary">Tej operacji nie można cofnąć.</p>
                                        <p className="mt-1 text-sm text-error-secondary">
                                            Usunięcie grupy spowoduje trwałe usunięcie wszystkich typowań i danych rankingowych.
                                        </p>
                                    </div>
                                    {actionError && (
                                        <p className="rounded-lg bg-error-primary px-3 py-2 text-sm text-error-primary">{actionError}</p>
                                    )}
                                    <Button
                                        color="primary-destructive"
                                        className="w-full"
                                        isLoading={isDeleting}
                                        showTextWhileLoading
                                        onClick={handleDeleteGroup}
                                    >
                                        Tak, usuń grupę
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

                            {sheet === "confirmLeave" && (
                                <div className="flex flex-col gap-4">
                                    <div className="rounded-xl border border-error-primary bg-error-primary px-4 py-3">
                                        <p className="text-sm font-semibold text-error-primary">Opuścić tę grupę?</p>
                                        <p className="mt-1 text-sm text-error-secondary">
                                            Stracisz dostęp do typowań i rankingu tej grupy. Możesz dołączyć ponownie używając kodu zaproszenia.
                                        </p>
                                    </div>
                                    {actionError && (
                                        <p className="rounded-lg bg-error-primary px-3 py-2 text-sm text-error-primary">{actionError}</p>
                                    )}
                                    <Button
                                        color="primary-destructive"
                                        className="w-full"
                                        isLoading={isLeaving}
                                        showTextWhileLoading
                                        onClick={handleLeaveGroup}
                                    >
                                        Tak, opuść grupę
                                    </Button>
                                    <button
                                        onClick={() => setSheet("options")}
                                        disabled={isLeaving}
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
