"use client";

import { Check, Copy01 } from "@untitledui/icons";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { useClipboard } from "@/hooks/use-clipboard";

export function CopyCodeButton({ code }: { code: string }) {
    const clipboard = useClipboard();
    return (
        <ButtonUtility
            color="tertiary"
            size="sm"
            tooltip={clipboard.copied ? "Skopiowano!" : "Kopiuj kod"}
            icon={clipboard.copied ? Check : Copy01}
            onClick={() => clipboard.copy(code)}
            className="ml-auto"
        />
    );
}
