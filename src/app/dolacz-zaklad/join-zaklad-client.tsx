"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
    kod: string;
    zakladId: string;
}

export function JoinZakladClient({ kod, zakladId }: Props) {
    const router = useRouter();
    const [status, setStatus] = useState<"joining" | "done" | "already" | "error">("joining");

    useEffect(() => {
        fetch("/api/zaklady/join", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kod }),
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.alreadyMember) {
                    setStatus("already");
                    setTimeout(() => router.push(`/zaklady/${zakladId}`), 1000);
                } else if (data.id) {
                    setStatus("done");
                    setTimeout(() => router.push(`/zaklady/${zakladId}`), 1000);
                } else {
                    setStatus("error");
                }
            })
            .catch(() => setStatus("error"));
    }, [kod, zakladId, router]);

    return (
        <div className="flex flex-col items-center gap-3 text-center">
            {status === "joining" && (
                <>
                    <div className="size-8 animate-spin rounded-full border-2 border-brand-solid border-t-transparent" />
                    <p className="text-sm text-tertiary">Dołączam do zakładu…</p>
                </>
            )}
            {(status === "done" || status === "already") && (
                <>
                    <div className="text-4xl">✅</div>
                    <p className="text-sm font-semibold text-primary">
                        {status === "already" ? "Już jesteś uczestnikiem!" : "Dołączono!"}
                    </p>
                    <p className="text-xs text-tertiary">Przekierowuję…</p>
                </>
            )}
            {status === "error" && (
                <p className="text-sm text-tertiary">Coś poszło nie tak. Spróbuj ponownie.</p>
            )}
        </div>
    );
}
