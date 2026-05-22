"use client";

import { Fragment, useRef, useState } from "react";
import { Camera01, Check, ChevronLeft, Copy01, Plus, Share01, Users01, X } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { createGroup, joinGroup, setGroupAvatar } from "@/actions/group-actions";
import { createClient } from "@/lib/supabase/client";
import { useClipboard } from "@/hooks/use-clipboard";
import { useRouter } from "next/navigation";
import { cx } from "@/utils/cx";

// ─── 2-step stepper ───────────────────────────────────────────────────────────

const STEP_LABELS = ["Rozgrywki", "Szczegóły"];

function Stepper({ step }: { step: 1 | 2 }) {
    return (
        <div className="flex items-center px-5 pt-4 pb-2">
            {STEP_LABELS.map((label, i) => {
                const num = (i + 1) as 1 | 2;
                const isDone = num < step;
                const isActive = num === step;
                return (
                    <Fragment key={i}>
                        <div className="flex flex-col items-center gap-1">
                            <div
                                className={cx(
                                    "flex size-7 items-center justify-center rounded-full text-xs font-semibold transition",
                                    isDone && "bg-brand-solid text-white",
                                    isActive && "border-2 border-brand-solid bg-primary text-brand-primary",
                                    !isDone && !isActive && "border border-secondary bg-primary text-quaternary",
                                )}
                            >
                                {isDone ? <Check className="size-3.5 shrink-0" /> : num}
                            </div>
                            <span className={cx("text-xs font-medium", isActive ? "text-secondary" : "text-quaternary")}>
                                {label}
                            </span>
                        </div>
                        {i < STEP_LABELS.length - 1 && (
                            <div
                                className={cx(
                                    "mb-5 h-px flex-1 mx-2 transition-colors",
                                    num < step ? "bg-brand-solid" : "bg-secondary",
                                )}
                            />
                        )}
                    </Fragment>
                );
            })}
        </div>
    );
}

// ─── Competition selector ─────────────────────────────────────────────────────

type CompetitionType = "wc_2026" | "ekstraklasa_2526";

const COMPETITIONS: { value: CompetitionType; name: string; subtitle: string }[] = [
    { value: "wc_2026",          name: "MŚ FIFA 2026", subtitle: "Mundial 2026" },
    { value: "ekstraklasa_2526", name: "Ekstraklasa",  subtitle: "Sezon 2025/2026" },
];

function CompetitionSelector({ value, onChange }: { value: CompetitionType; onChange: (v: CompetitionType) => void }) {
    return (
        <div className="flex flex-col gap-3">
            {COMPETITIONS.map((c) => {
                const selected = value === c.value;
                return (
                    <button
                        key={c.value}
                        type="button"
                        onClick={() => onChange(c.value)}
                        className={cx(
                            "flex w-full flex-col gap-0.5 rounded-xl border p-4 text-left transition",
                            selected
                                ? "border-primary bg-secondary"
                                : "border-secondary bg-primary hover:bg-secondary",
                        )}
                    >
                        <p className="text-base font-semibold text-primary">{c.name}</p>
                        <p className="text-sm text-tertiary">{c.subtitle}</p>
                    </button>
                );
            })}
        </div>
    );
}

// ─── Compact avatar picker ────────────────────────────────────────────────────

function CompactAvatarPicker({ previewUrl, onFileSelect }: { previewUrl: string | null; onFileSelect: (f: File) => void }) {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div className="flex flex-col items-center gap-1.5">
            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex size-[72px] items-center justify-center overflow-hidden rounded-2xl border border-dashed border-secondary bg-secondary transition hover:bg-secondary_hover"
            >
                {previewUrl ? (
                    <img src={previewUrl} alt="" className="size-full object-cover" />
                ) : (
                    <Camera01 className="size-6 text-quaternary" />
                )}
            </button>
            <span className="text-xs text-tertiary">Zdjęcie grupy (opcjonalne)</span>
            <input ref={inputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileSelect(f); }} />
        </div>
    );
}

// ─── Invite screen ────────────────────────────────────────────────────────────

function InviteScreen({ group, onClose }: { group: { id: string; name: string; invite_code: string }; onClose: () => void }) {
    const router = useRouter();
    const clipboard = useClipboard();
    const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

    const inviteUrl = typeof window !== "undefined"
        ? `${window.location.origin}/dolacz?kod=${group.invite_code}`
        : `/dolacz?kod=${group.invite_code}`;
    const inviteText = `Dołącz do mojej grupy „${group.name}" na Typerek!\n${inviteUrl}`;

    function goToGroup() { onClose(); router.push(`/grupy/${group.id}`); }

    return (
        <div className="flex flex-1 flex-col gap-5 px-5 py-6">
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                <p className="text-sm text-tertiary">Zaproś znajomych do grupy</p>
                <p className="text-xl font-bold text-primary">{group.name}</p>
                {/* Code box with inline copy button */}
                <button
                    type="button"
                    onClick={() => clipboard.copy(inviteText)}
                    className="mt-2 flex items-center gap-3 rounded-2xl border border-secondary bg-secondary px-8 py-5 transition hover:bg-secondary_hover"
                >
                    <p className="font-mono text-4xl font-bold tracking-[0.3em] text-primary">
                        {group.invite_code}
                    </p>
                    {clipboard.copied
                        ? <Check className="size-5 shrink-0 text-success-primary" />
                        : <Copy01 className="size-5 shrink-0 text-tertiary" />
                    }
                </button>
                <p className="text-xs text-tertiary">Kod zaproszenia · kliknij aby skopiować</p>
            </div>
            <div className="flex flex-col gap-2">
                <Button
                    onClick={async () => { try { await navigator.share({ title: "Typerek", text: inviteText, url: inviteUrl }); } catch {} }}
                    iconLeading={Share01}
                    className="w-full"
                    size="lg"
                >
                    Zaproś znajomych
                </Button>
                <Button color="secondary" onClick={goToGroup} className="w-full" size="lg">
                    Przejdź do grupy
                </Button>
            </div>
        </div>
    );
}

// ─── Create group — full-screen page ─────────────────────────────────────────

export function CreateGroupModal({ buttonClassName }: { buttonClassName?: string }) {
    const [isOpen, setIsOpen]               = useState(false);
    const [step, setStep]                   = useState<1 | 2 | 3>(1);
    const [competition, setCompetition]     = useState<CompetitionType>("wc_2026");
    const [avatarFile, setAvatarFile]       = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [error, setError]                 = useState<string | null>(null);
    const [isLoading, setIsLoading]         = useState(false);
    const [createdGroup, setCreatedGroup]   = useState<{ id: string; name: string; invite_code: string } | null>(null);

    const supabase = createClient();

    function handleOpen() {
        setIsOpen(true);
        setStep(1);
        setError(null);
        setCreatedGroup(null);
        setCompetition("wc_2026");
        setAvatarFile(null);
        setAvatarPreview(null);
    }

    function handleClose() { setIsOpen(false); }

    function handleFileSelect(f: File) {
        setAvatarFile(f);
        setAvatarPreview(URL.createObjectURL(f));
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        const fd = new FormData(e.currentTarget);
        fd.set("competition_type", competition);
        const result = await createGroup(fd);

        if ("error" in result && result.error) {
            setError(result.error);
            setIsLoading(false);
            return;
        }

        const group = (result as { success: true; group: { id: string; name: string; invite_code: string } }).group;

        if (avatarFile) {
            try {
                const path = `${group.id}/${Date.now()}.jpg`;
                const { data, error: uploadErr } = await supabase.storage
                    .from("group-avatars")
                    .upload(path, avatarFile, { contentType: avatarFile.type, upsert: true });
                if (!uploadErr && data) {
                    const { data: { publicUrl } } = supabase.storage.from("group-avatars").getPublicUrl(data.path);
                    await setGroupAvatar(group.id, publicUrl);
                }
            } catch { /* ignore */ }
        }

        setCreatedGroup(group);
        setStep(3);
        setIsLoading(false);
    }

    return (
        <>
            <Button iconLeading={Plus} onClick={handleOpen} size="md" className={buttonClassName}>
                Utwórz grupę
            </Button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex flex-col bg-primary">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-secondary px-5 py-4">
                        <h2 className="text-xl font-bold text-primary">
                            {step === 3 ? "Zaproszenie" : "Nowa grupa"}
                        </h2>
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex size-10 items-center justify-center rounded-full bg-secondary text-primary transition hover:bg-secondary_hover"
                        >
                            <X className="size-5" />
                        </button>
                    </div>

                    {/* Stepper — steps 1 & 2 only */}
                    {step < 3 && <Stepper step={step as 1 | 2} />}

                    {/* Step 1 — competition */}
                    {step === 1 && (
                        <div className="flex flex-1 flex-col gap-4 px-5 py-4">
                            <CompetitionSelector value={competition} onChange={setCompetition} />
                            <div className="mt-auto">
                                <Button onClick={() => setStep(2)} className="w-full" size="lg">
                                    Dalej
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 2 — avatar + name */}
                    {step === 2 && (
                        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-5 py-4">
                            <CompactAvatarPicker previewUrl={avatarPreview} onFileSelect={handleFileSelect} />
                            <Input name="name" label="Nazwa grupy" placeholder="np. Drużyna z biura" isRequired />
                            {error && (
                                <p className="rounded-lg bg-error-primary px-3 py-2 text-sm text-error-primary">
                                    {error}
                                </p>
                            )}
                            <div className="mt-auto flex gap-3">
                                <Button color="secondary" onClick={() => setStep(1)} type="button" iconLeading={ChevronLeft} className="flex-1" size="lg">
                                    Wróć
                                </Button>
                                <Button type="submit" isLoading={isLoading} showTextWhileLoading className="flex-1" size="lg">
                                    Utwórz
                                </Button>
                            </div>
                        </form>
                    )}

                    {/* Step 3 — invite */}
                    {step === 3 && createdGroup && (
                        <InviteScreen group={createdGroup} onClose={handleClose} />
                    )}
                </div>
            )}
        </>
    );
}

// ─── Join group modal (bottom sheet) ─────────────────────────────────────────

export function JoinGroupModal({ buttonClassName }: { buttonClassName?: string }) {
    const [isOpen, setIsOpen]       = useState(false);
    const [error, setError]         = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        const result = await joinGroup(new FormData(e.currentTarget));
        if (result?.error) {
            setError(result.error);
            setIsLoading(false);
        }
    }

    return (
        <DialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
            <Button iconLeading={Users01} color="secondary" onClick={() => setIsOpen(true)} size="md" className={buttonClassName}>
                Dołącz do grupy
            </Button>
            <ModalOverlay>
                <Modal>
                    <Dialog>
                        <div className="w-full max-w-md rounded-2xl bg-primary shadow-xl ring-1 ring-secondary">
                            <div className="flex items-center justify-between border-b border-secondary px-6 py-4">
                                <h2 className="text-lg font-semibold text-primary">Dołącz do grupy</h2>
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="flex size-10 items-center justify-center rounded-full bg-secondary text-primary transition hover:bg-secondary_hover"
                                >
                                    <X className="size-5" />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
                                <p className="text-sm text-tertiary">
                                    Wpisz 6-znakowy kod zaproszenia otrzymany od administratora grupy.
                                </p>
                                <Input name="invite_code" label="Kod zaproszenia" placeholder="np. AB1CD2" isRequired maxLength={6} />
                                {error && (
                                    <p className="rounded-lg bg-error-primary px-3 py-2 text-sm text-error-primary">
                                        {error}
                                    </p>
                                )}
                                <div className="flex gap-3">
                                    <Button color="secondary" onClick={() => setIsOpen(false)} type="button" className="flex-1">
                                        Anuluj
                                    </Button>
                                    <Button type="submit" isLoading={isLoading} showTextWhileLoading className="flex-1">
                                        Dołącz
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </DialogTrigger>
    );
}
