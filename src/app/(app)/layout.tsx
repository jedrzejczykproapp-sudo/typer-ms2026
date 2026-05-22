import type { ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AccountSettingsMenu } from "@/components/app/account-settings-menu";
import { Logo } from "@/components/app/logo";

export default async function AppLayout({ children }: { children: ReactNode }) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { data: profile } = user
        ? await supabase.from("profiles").select("display_name, avatar_url").eq("id", user.id).single()
        : { data: null };

    const displayName = profile?.display_name ?? "?";

    return (
        <div className="min-h-dvh bg-secondary">
            <header className="sticky top-0 z-30 border-b border-secondary bg-primary">
                <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
                    {/* Logo */}
                    <Link href="/konto" className="flex items-center">
                        <Logo height={17} className="text-primary" />
                    </Link>

                    {/* Avatar + name (opens account sheet) */}
                    {user && (
                        <AccountSettingsMenu
                            displayName={displayName}
                            avatarUrl={profile?.avatar_url ?? null}
                            email={user.email ?? ""}
                            userId={user.id}
                        />
                    )}
                </div>
            </header>

            <main className="mx-auto max-w-2xl px-4 py-6 pb-6">{children}</main>
        </div>
    );
}
