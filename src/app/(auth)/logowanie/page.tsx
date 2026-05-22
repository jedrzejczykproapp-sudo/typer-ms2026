"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { signIn } from "@/actions/auth-actions";
import { Logo } from "@/components/app/logo";

function LogowanieForm() {
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const searchParams = useSearchParams();
    const kod = searchParams.get("kod");
    const redirectTo = kod ? `/dolacz?kod=${encodeURIComponent(kod)}` : null;

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        const result = await signIn(new FormData(e.currentTarget));
        if (result?.error) {
            setError(result.error);
            setIsLoading(false);
        }
    }

    return (
        <div className="flex flex-col items-center gap-8">
            <div className="flex flex-col items-center gap-4 text-center">
                <Logo height={24} className="text-primary" />
                <p className="text-sm text-tertiary">
                    {kod ? "Zaloguj się, aby dołączyć do grupy" : "Zaloguj się do swojego konta"}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
                {redirectTo && (
                    <input type="hidden" name="redirect_to" value={redirectTo} />
                )}
                <Input
                    name="email"
                    type="email"
                    label="Email"
                    placeholder="jan@przykład.pl"
                    isRequired
                    autoComplete="email"
                />
                <Input
                    name="password"
                    type="password"
                    label="Hasło"
                    placeholder="Twoje hasło"
                    isRequired
                    autoComplete="current-password"
                />

                {error && (
                    <p className="rounded-lg bg-error-primary px-3 py-2 text-sm text-error-primary">{error}</p>
                )}

                <Button type="submit" size="lg" isLoading={isLoading} showTextWhileLoading className="mt-1 w-full">
                    Zaloguj się
                </Button>
            </form>

            <p className="text-sm text-tertiary">
                Nie masz konta?{" "}
                <Button
                    href={kod ? `/rejestracja?kod=${encodeURIComponent(kod)}` : "/rejestracja"}
                    color="link-color"
                    size="sm"
                >
                    Zarejestruj się
                </Button>
            </p>
        </div>
    );
}

export default function LogowaniePage() {
    return (
        <Suspense>
            <LogowanieForm />
        </Suspense>
    );
}
