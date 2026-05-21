import type { ReactNode } from "react";
import { Trophy01 } from "@untitledui/icons";
import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { SignOutButton } from "@/components/app/sign-out-button";

export default async function AppLayout({ children }: { children: ReactNode }) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { data: profile } = user ? await supabase.from("profiles").select("display_name").eq("id", user.id).single() : { data: null };

    return (
        <div className="min-h-dvh bg-secondary">
            <header className="sticky top-0 z-30 border-b border-secondary bg-primary">
                <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
                    <div className="flex items-center gap-2">
                        <Trophy01 className="size-5 text-fg-brand-primary" />
                        <span className="font-bold text-primary">Typer MŚ 2026</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-sm text-tertiary">{profile?.display_name}</span>
                        <ThemeToggle />
                        <SignOutButton />
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-2xl px-4 py-6 pb-24 lg:pb-6">{children}</main>
        </div>
    );
}
