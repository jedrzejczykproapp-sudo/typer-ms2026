"use client";

import { useRef, useState } from "react";
import { Check, Copy01, Plus, Share01, Users01, X } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { createGroup, joinGroup, setGroupAvatar } from "@/actions/group-actions";
import { AvatarCropPicker, type AvatarCropHandle } from "@/components/app/group-settings-menu";
import { createClient } from "@/lib/supabase/client";
import { useClipboard } from "@/hooks/use-clipboard";
import { useRouter } from "next/navigation";

// ─── Shared modal shell ───────────────────────────────────────────────────────

function ModalContent({
    title,
    onClose,
    children,
}: {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
}) {
    return (
        <div className="w-full max-w-md rounded-2xl bg-primary shadow-xl ring-1 ring-secondary">
            <div className="flex items-center justify-between border-b border-secondary px-6 py-4">
                <h2 className="text-lg font-semibold text-primary">{title}</h2>
                <Button color="tertiary" size="sm" onClick={onClose} type="button">
                    <X className="size-4" data-icon />
                </Button>
            </div>
            {children}
        </div>
    );
}

// ─── Competition type selector ────────────────────────────────────────────────

type CompetitionType = "wc_2026" | "ekstraklasa_2526";

const COMPETITIONS: { value: CompetitionType; name: string; subtitle: string }[] = [
    { value: "wc_2026",         name: "MŚ FIFA 2026",        subtitle: "Mundial 2026" },
    { value: "ekstraklasa_2526", name: "Ekstraklasa",         subtitle: "Sezon 2025/2026" },
];

function CompetitionSelector({
    value,
    onChange,
}: {
    value: CompetitionType;
    onChange: (v: CompetitionType) => void;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-secondary">Rozgrywki</span>
            <div className="grid grid-cols-2 gap-2">
                {COMPETITIONS.map((c) => {
                    const selected = value === c.value;
                    return (
                        <button
                            key={c.value}
                            type="button"
                            onClick={() => onChange(c.value)}
                            className={`flex flex-col gap-0.5 rounded-xl border p-3 text-left transition ${
                                selected
                                    ? "border-brand-primary bg-brand-primary"
                                    : "border-secondary bg-primary hover:bg-secondary"
                            }`}
                        >
                            <p className={`text-sm font-semibold ${selected ? "text-brand-primary" : "text-primary"}`}>
                                {c.name}
                            </p>
                            <p className={`text-xs ${selected ? "text-brand-secondary" : "text-tertiary"}`}>
                                {c.subtitle}
                            </p>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Invite share screen (step 2) ────────────────────────────────────────────

function InviteScreen({
    group,
    onClose,
}: {
    group: { id: string; name: string; invite_code: string };
    onClose: () => void;
}) {
    const router = useRouter();
    const clipboard = useClipboard();
    const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

    const inviteText = `Dołącz do mojej grupy „${group.name}" na typerek.com!\nKod zaproszenia: ${group.invite_code}`;

    function handleCopy() {
        clipboard.copy(inviteText);
    }

    async function handleShare() {
        try {
            await navigator.share({ title: "typerek", text: inviteText });
        } catch {
            // user dismissed share sheet — ignore
        }
    }

    function goToGroup() {
        onClose();
        router.push(`/grupy/${group.id}`);
    }

    return (
        <div className="flex flex-col gap-5 px-6 py-6">
            <div className="flex flex-col items-center gap-2 py-2 text-center">
                <p className="text-sm text-tertiary">Zaproś znajomych do grupy</p>
                <p className="text-lg font-bold text-primary">{group.name}</p>
                <div className="mt-2 rounded-2xl border border-secondary bg-secondary px-8 py-4">
                    <p className="font-mono text-3xl font-bold tracking-[0.25em] text-primary">
                        {group.invite_code}
                    </p>
                    <p className="mt-1 text-xs text-tertiary">Kod zaproszenia</p>
                </div>
            </div>

            <div className="flex flex-col gap-2">
                {canShare && (
                    <Button onClick={handleShare} iconLeading={Share01} className="w-full">
                        Udostępnij zaproszenie
                    </Button>
                )}
                <Button
                    color="secondary"
                    onClick={handleCopy}
                    iconLeading={clipboard.copied ? Check : Copy01}
                    className="w-full"
                >
                    {clipboard.copied ? "Skopiowano!" : "Kopiuj zaproszenie"}
                </Button>
                <Button color="tertiary" onClick={goToGroup} className="w-full">
                    Wejdź do grupy →
                </Button>
            </div>
        </div>
    );
}

// ─── Create group modal ───────────────────────────────────────────────────────

export function CreateGroupModal() {
    const [isOpen, setIsOpen]           = useState(false);
    const [step, setStep]               = useState<1 | 2>(1);
    const [competition, setCompetition] = useState<CompetitionType>("wc_2026");
    const [error, setError]             = useState<string | null>(null);
    const [isLoading, setIsLoading]     = useState(false);
    const [createdGroup, setCreatedGroup] = useState<{ id: string; name: string; invite_code: string } | null>(null);

    const cropRef  = useRef<AvatarCropHandle>(null);
    const supabase = createClient();

    function handleOpen() {
        setIsOpen(true);
        setStep(1);
        setError(null);
        setCreatedGroup(null);
        setCompetition("wc_2026");
    }

    function handleClose() {
        setIsOpen(false);
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

        // Upload avatar if user selected one
        if (cropRef.current?.hasImage()) {
            try {
                const blob = await cropRef.current.getCroppedBlob();
                if (blob) {
                    const path = `${group.id}/${Date.now()}.jpg`;
                    const { data, error: uploadErr } = await supabase.storage
                        .from("group-avatars")
                        .upload(path, blob, { contentType: "image/jpeg", upsert: true });

                    if (!uploadErr && data) {
                        const { data: { publicUrl } } = supabase.storage.from("group-avatars").getPublicUrl(data.path);
                        await setGroupAvatar(group.id, publicUrl);
                    }
                }
            } catch {
                // Avatar upload failed — group was still created successfully
            }
        }

        setCreatedGroup(group);
        setStep(2);
        setIsLoading(false);
    }

    return (
        <DialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
            <Button iconLeading={Plus} onClick={handleOpen} size="md">
                Utwórz grupę
            </Button>
            <ModalOverlay>
                <Modal>
                    <Dialog>
                        <ModalContent
                            title={step === 1 ? "Nowa grupa" : "Zaproszenie"}
                            onClose={handleClose}
                        >
                            {step === 1 ? (
                                <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
                                    {/* Avatar picker */}
                                    <AvatarCropPicker ref={cropRef} currentUrl={null} />

                                    {/* Name */}
                                    <Input name="name" label="Nazwa grupy" placeholder="np. Drużyna z biura" isRequired />

                                    {/* Competition selector */}
                                    <CompetitionSelector value={competition} onChange={setCompetition} />

                                    {error && (
                                        <p className="rounded-lg bg-error-primary px-3 py-2 text-sm text-error-primary">
                                            {error}
                                        </p>
                                    )}

                                    <div className="flex justify-end gap-3">
                                        <Button color="secondary" onClick={handleClose} type="button">
                                            Anuluj
                                        </Button>
                                        <Button type="submit" isLoading={isLoading} showTextWhileLoading>
                                            Utwórz
                                        </Button>
                                    </div>
                                </form>
                            ) : (
                                createdGroup && (
                                    <InviteScreen group={createdGroup} onClose={handleClose} />
                                )
                            )}
                        </ModalContent>
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </DialogTrigger>
    );
}

// ─── Join group modal ─────────────────────────────────────────────────────────

export function JoinGroupModal() {
    const [isOpen, setIsOpen]     = useState(false);
    const [error, setError]       = useState<string | null>(null);
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
            <Button iconLeading={Users01} color="secondary" onClick={() => setIsOpen(true)} size="md">
                Dołącz do grupy
            </Button>
            <ModalOverlay>
                <Modal>
                    <Dialog>
                        <ModalContent title="Dołącz do grupy" onClose={() => setIsOpen(false)}>
                            <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
                                <p className="text-sm text-tertiary">
                                    Wpisz 6-znakowy kod zaproszenia otrzymany od administratora grupy.
                                </p>
                                <Input
                                    name="invite_code"
                                    label="Kod zaproszenia"
                                    placeholder="np. AB1CD2"
                                    isRequired
                                    maxLength={6}
                                />
                                {error && (
                                    <p className="rounded-lg bg-error-primary px-3 py-2 text-sm text-error-primary">
                                        {error}
                                    </p>
                                )}
                                <div className="flex justify-end gap-3">
                                    <Button color="secondary" onClick={() => setIsOpen(false)} type="button">
                                        Anuluj
                                    </Button>
                                    <Button type="submit" isLoading={isLoading} showTextWhileLoading>
                                        Dołącz
                                    </Button>
                                </div>
                            </form>
                        </ModalContent>
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </DialogTrigger>
    );
}
