import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/app/logo";
import { Button } from "@/components/base/buttons/button";
import { JoinClient } from "./join-client";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://typerek.com";

type Props = {
    searchParams: Promise<{ kod?: string }>;
};

// Fetch group name + avatar — uses SECURITY DEFINER RPC so it works
// even without an authenticated session (e.g. for link-preview bots).
async function getGroupPreview(kod: string) {
    const supabase = await createClient();

    // Try public RPC function first
    const { data: rpcData } = await supabase.rpc("get_group_preview", { p_code: kod });
    if (Array.isArray(rpcData) && rpcData[0]) {
        return rpcData[0] as { name: string; avatar_url: string | null };
    }

    // Fallback: direct query (works when user is authenticated)
    const { data } = await supabase
        .from("groups")
        .select("name, avatar_url")
        .eq("invite_code", kod.trim().toUpperCase())
        .single();

    return data ?? null;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
    const { kod } = await searchParams;

    if (!kod) return { title: "Typerek" };

    const group = await getGroupPreview(kod);
    const groupName = group?.name ?? null;
    const avatarUrl = group?.avatar_url ?? null;

    const title = groupName ? `Dołącz do „${groupName}" na Typerek` : "Dołącz do grupy na Typerek";
    const description = groupName
        ? `Obstawiaj wyniki razem z grupą „${groupName}" na Typerek!`
        : "Obstawiaj wyniki razem ze znajomymi na Typerek!";

    const ogParams = new URLSearchParams();
    if (groupName) ogParams.set("name", groupName);
    if (avatarUrl) ogParams.set("avatar", avatarUrl);
    const ogImageUrl = `${APP_URL}/api/og?${ogParams.toString()}`;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
            type: "website",
            siteName: "Typerek",
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: [ogImageUrl],
        },
    };
}

export default async function DolaczPage({ searchParams }: Props) {
    const { kod } = await searchParams;

    if (!kod) redirect("/konto");

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const group = await getGroupPreview(kod);

    return (
        <div className="flex min-h-dvh items-center justify-center bg-secondary px-4 py-12">
            <div className="flex w-full max-w-sm flex-col items-center gap-8">
                <Logo height={24} className="text-primary" />

                {/* Avatar grupy */}
                {group?.avatar_url && (
                    <img
                        src={group.avatar_url}
                        alt={group.name}
                        className="size-20 rounded-2xl object-cover shadow-lg ring-1 ring-secondary"
                    />
                )}

                {/* Nagłówek */}
                <div className="flex flex-col items-center gap-1 text-center">
                    <h1 className="text-xl font-bold text-primary">
                        {group ? `Dołącz do „${group.name}"` : "Dołącz do grupy"}
                    </h1>
                    <p className="text-sm text-tertiary">
                        Obstawiaj wyniki razem ze znajomymi na Typerek
                    </p>
                </div>

                {/* Akcja */}
                {user ? (
                    // Zalogowany — auto-dołącz po stronie klienta
                    <JoinClient kod={kod} />
                ) : (
                    // Niezalogowany — pokaż przyciski
                    <div className="flex w-full flex-col gap-3">
                        <Button
                            href={`/rejestracja?kod=${encodeURIComponent(kod)}`}
                            size="lg"
                            className="w-full"
                        >
                            Zarejestruj się i dołącz
                        </Button>
                        <Button
                            href={`/logowanie?kod=${encodeURIComponent(kod)}`}
                            color="secondary"
                            size="lg"
                            className="w-full"
                        >
                            Mam już konto — zaloguj się
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
