"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { joinGroupByCode } from "@/actions/group-actions";

export function JoinClient({ kod }: { kod: string }) {
    const router = useRouter();

    useEffect(() => {
        joinGroupByCode(kod).then((result) => {
            if ("success" in result && result.success) {
                router.replace(`/grupy/${result.groupId}`);
            } else {
                router.replace("/konto");
            }
        });
    }, [kod, router]);

    return (
        <div className="flex items-center gap-2.5 text-sm text-tertiary">
            <span className="size-4 animate-spin rounded-full border-2 border-quaternary border-t-brand" />
            Dołączanie do grupy…
        </div>
    );
}
