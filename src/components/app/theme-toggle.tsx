"use client";

import { Moon01, Sun } from "@untitledui/icons";
import { useTheme } from "next-themes";
import { ButtonUtility } from "@/components/base/buttons/button-utility";

export function ThemeToggle() {
    const { resolvedTheme, setTheme } = useTheme();

    return (
        <ButtonUtility
            color="tertiary"
            size="sm"
            tooltip={resolvedTheme === "dark" ? "Tryb jasny" : "Tryb ciemny"}
            icon={resolvedTheme === "dark" ? Sun : Moon01}
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        />
    );
}
