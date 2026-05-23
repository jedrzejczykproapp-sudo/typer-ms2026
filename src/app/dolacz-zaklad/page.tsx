import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/app/logo";
import { Button } from "@/components/base/buttons/button";
import { JoinZakladClient } from "./join-zaklad-client";

type Props = {
    searchParams: Promise<{ kod?: string }>;
};

export default async function DolaczZakladPage({ searchParams }: Props) {
    const { kod } = await searchParams;

    if (!kod) redirect("/zaklady");

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch zakład info by invite code
    const { data: zaklad } = await supabase
        .from("zaklady")
        .select("id, number, zaklad_fixtures(id), zaklad_members(user_id)")
        .eq("invite_code", kod.trim())
        .single();

    const exists = !!zaklad;
    const memberCount = (zaklad?.zaklad_members as { user_id: string }[] | undefined)?.length ?? 0;
    const fixtureCount = (zaklad?.zaklad_fixtures as { id: string }[] | undefined)?.length ?? 0;

    return (
        <div className="flex min-h-dvh items-center justify-center bg-secondary px-4 py-12">
            <div className="flex w-full max-w-sm flex-col items-center gap-8">
                <Logo height={24} className="text-primary" />

                {/* Icon */}
                <div className="flex size-20 items-center justify-center rounded-2xl bg-brand-secondary text-4xl shadow-sm ring-1 ring-secondary">
                    🎯
                </div>

                {/* Header */}
                <div className="flex flex-col items-center gap-1 text-center">
                    {exists ? (
                        <>
                            <h1 className="text-xl font-bold text-primary">Dołącz do zakładu #{zaklad!.number}</h1>
                            <p className="text-sm text-tertiary">
                                {fixtureCount} {fixtureCount === 1 ? "mecz" : "meczów"} · {memberCount} {memberCount === 1 ? "uczestnik" : "uczestników"}
                            </p>
                        </>
                    ) : (
                        <>
                            <h1 className="text-xl font-bold text-primary">Nieprawidłowy link</h1>
                            <p className="text-sm text-tertiary">Ten zakład nie istnieje lub link jest błędny.</p>
                        </>
                    )}
                </div>

                {/* Action */}
                {exists && (
                    user ? (
                        <JoinZakladClient kod={kod} zakladId={zaklad!.id} />
                    ) : (
                        <div className="flex w-full flex-col gap-3">
                            <Button
                                href={`/rejestracja?kod-zaklad=${encodeURIComponent(kod)}`}
                                size="lg"
                                className="w-full"
                            >
                                Zarejestruj się i dołącz
                            </Button>
                            <Button
                                href={`/logowanie?kod-zaklad=${encodeURIComponent(kod)}`}
                                color="secondary"
                                size="lg"
                                className="w-full"
                            >
                                Mam już konto — zaloguj się
                            </Button>
                        </div>
                    )
                )}

                {!exists && (
                    <Button href="/zaklady" color="secondary" size="lg" className="w-full">
                        Wróć do zakładów
                    </Button>
                )}
            </div>
        </div>
    );
}
