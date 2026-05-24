import type { ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/app/logo";
import { AppNav } from "@/components/app/app-nav";

export default async function AppLayout({ children }: { children: ReactNode }) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { data: profile } = user
        ? await supabase.from("profiles").select("display_name, avatar_url").eq("id", user.id).single()
        : { data: null };

    const displayName = profile?.display_name ?? "?";
    const inits = displayName
        .split(" ")
        .map((w: string) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    return (
        <div className="min-h-dvh bg-secondary">
            <header className="sticky top-0 z-30 border-b border-secondary bg-primary">
                <div className="mx-auto flex h-14 max-w-2xl items-center px-4">
                    <Link href="/mecze" className="flex items-center">
                        <Logo height={17} className="text-primary" />
                    </Link>
                </div>
            </header>

            {/* Global navigation — desktop: sticky below header; mobile: fixed bottom */}
            <AppNav
                profileSrc={profile?.avatar_url ?? null}
                profileInits={inits}
            />

            {/* pb-20 on mobile for the fixed bottom nav; lg:pb-6 on desktop */}
            <main className="mx-auto max-w-2xl px-4 py-6 pb-24 lg:pb-6">{children}</main>
        </div>
    );
}
