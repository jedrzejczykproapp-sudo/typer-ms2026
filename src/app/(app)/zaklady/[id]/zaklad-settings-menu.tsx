"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, DotsVertical, Copy01, CheckCircle, Trash01 } from "@untitledui/icons";
import { ButtonUtility } from "@/components/base/buttons/button-utility";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://typerek.com";

interface Props {
    zakladId: string;
    zakladNumber: number;
    inviteCode: string;
    memberCount: number;
    isCreator: boolean;
}

type Sheet = "options" | "confirmCancel";

export function ZakladSettingsMenu({ zakladId, zakladNumber, inviteCode, memberCount, isCreator }: Props) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [sheet, setSheet] = useState<Sheet>("options");
    const [copied, setCopied] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const inviteLink = `${APP_URL}/dolacz-zaklad?kod=${inviteCode}`;

    function open() {
        setSheet("options");
        setIsOpen(true);
    }

    function close() {
        setIsOpen(false);
    }

    async function handleShare() {
        if (typeof navigator.share === "function") {
            try {
                await navigator.share({ title: `Zakład #${zakladNumber} na Typerek!`, url: inviteLink });
            } catch {
                /* dismissed */
            }
        } else {
            navigator.clipboard.writeText(inviteLink).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
        }
    }

    async function doCancel() {
        setIsDeleting(true);
        setDeleteError(null);
        try {
            const res = await fetch(`/api/zaklady/${zakladId}`, { method: "DELETE" });
            if (!res.ok) {
                const data = await res.json();
                setDeleteError(data?.error ?? "Błąd serwera");
                setIsDeleting(false);
                return;
            }
            router.refresh();
            router.push("/zaklady");
        } catch {
            setDeleteError("Błąd połączenia");
            setIsDeleting(false);
        }
    }

    return (
        <>
            <ButtonUtility
                icon={DotsVertical}
                color="secondary"
                size="sm"
                tooltip="Opcje zakładu"
                onClick={open}
            />

            {isOpen && (
                <>
                    {/* Overlay */}
                    <div className="fixed inset-0 z-50 bg-overlay/50" onClick={close} />

                    {/* Bottom sheet */}
                    <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-2xl rounded-t-2xl bg-primary shadow-xl ring-1 ring-secondary">
                        {/* Header */}
                        <div className="flex items-center gap-2 border-b border-secondary px-4 py-3">
                            <span className="flex-1 text-sm font-semibold text-primary">
                                {sheet === "options" ? `Zakład #${zakladNumber}` : "Anuluj zakład"}
                            </span>
                            <button
                                onClick={close}
                                className="rounded-lg p-1.5 text-fg-quaternary hover:bg-secondary hover:text-fg-tertiary"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <div className="max-h-[70dvh] overflow-y-auto px-4 py-4 pb-8">
                            {/* Options list */}
                            {sheet === "options" && (
                                <div className="flex flex-col">
                                    {/* Zaproś */}
                                    <button
                                        onClick={handleShare}
                                        className="flex items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-secondary"
                                    >
                                        {copied ? (
                                            <CheckCircle className="size-5 shrink-0 text-success-primary" />
                                        ) : (
                                            <Copy01 className="size-5 shrink-0 text-fg-tertiary" />
                                        )}
                                        <div>
                                            <p className="text-sm font-medium text-primary">
                                                {copied ? "Skopiowano!" : "Zaproś znajomych"}
                                            </p>
                                            <p className="text-xs text-tertiary">Skopiuj link zaproszenia do zakładu</p>
                                        </div>
                                    </button>

                                    {/* Anuluj — tylko twórca */}
                                    {isCreator && (
                                        <>
                                            <div className="my-1 border-t border-secondary" />
                                            <button
                                                onClick={() => {
                                                    setDeleteError(null);
                                                    setSheet("confirmCancel");
                                                }}
                                                className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-error-primary transition hover:bg-error-primary"
                                            >
                                                <Trash01 className="size-5 shrink-0" />
                                                <p className="text-sm font-medium">Anuluj zakład</p>
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Confirm cancel */}
                            {sheet === "confirmCancel" && (
                                <div className="flex flex-col gap-4">
                                    <div className="rounded-xl border border-error-primary bg-error-primary px-4 py-3">
                                        <p className="text-sm font-semibold text-error-primary">Anulować zakład?</p>
                                        <p className="mt-1 text-sm text-error-secondary">
                                            {memberCount > 1
                                                ? `Zakład ma ${memberCount} uczestników. Wszyscy stracą dostęp, a typy zostaną usunięte.`
                                                : "Zakład i wszystkie typy zostaną trwale usunięte."}
                                        </p>
                                    </div>

                                    {deleteError && (
                                        <p className="rounded-lg bg-error-primary px-3 py-2 text-sm text-error-primary">
                                            {deleteError}
                                        </p>
                                    )}

                                    <button
                                        onClick={doCancel}
                                        disabled={isDeleting}
                                        className="w-full rounded-xl bg-error-solid py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        {isDeleting ? "Anuluję…" : "Tak, anuluj zakład"}
                                    </button>
                                    <button
                                        onClick={() => setSheet("options")}
                                        disabled={isDeleting}
                                        className="w-full rounded-xl border border-secondary py-2.5 text-sm font-semibold text-secondary transition hover:bg-secondary disabled:opacity-40"
                                    >
                                        Wróć
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
