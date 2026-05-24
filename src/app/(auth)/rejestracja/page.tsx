"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { signUp } from "@/actions/auth-actions";
import { Logo } from "@/components/app/logo";

function RejestracjaForm() {
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const searchParams = useSearchParams();
    const kod = searchParams.get("kod");
    const kodZaklad = searchParams.get("kod-zaklad");
    const redirectTo = kodZaklad
        ? `/dolacz-zaklad?kod=${encodeURIComponent(kodZaklad)}`
        : kod
          ? `/dolacz?kod=${encodeURIComponent(kod)}`
          : null;

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);

        const form = e.currentTarget;
        const formData = new FormData(form);
        const password = formData.get("password") as string;
        const confirm = formData.get("confirm_password") as string;

        if (password !== confirm) {
            setError("Hasła nie są identyczne");
            return;
        }

        setIsLoading(true);
        const result = await signUp(formData);
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
                    {kodZaklad ? "Zarejestruj się, aby dołączyć do zakładu" : kod ? "Zarejestruj się, aby dołączyć do grupy" : "Dołącz do Typera MŚ 2026"}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
                {redirectTo && (
                    <input type="hidden" name="redirect_to" value={redirectTo} />
                )}
                <Input
                    name="display_name"
                    label="Nazwa gracza"
                    placeholder="Jak mają cię widzieć inni?"
                    isRequired
                    autoComplete="nickname"
                />
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
                    placeholder="Min. 8 znaków"
                    isRequired
                    autoComplete="new-password"
                />
                <Input
                    name="confirm_password"
                    type="password"
                    label="Potwierdź hasło"
                    placeholder="Powtórz hasło"
                    isRequired
                    autoComplete="new-password"
                />

                {error && (
                    <p className="rounded-lg bg-error-primary px-3 py-2 text-sm text-error-primary">{error}</p>
                )}

                <Button type="submit" size="lg" isLoading={isLoading} showTextWhileLoading className="mt-1 w-full">
                    Zarejestruj się
                </Button>
            </form>

            <p className="text-sm text-tertiary">
                Masz już konto?{" "}
                <Button
                    href={kodZaklad ? `/logowanie?kod-zaklad=${encodeURIComponent(kodZaklad)}` : kod ? `/logowanie?kod=${encodeURIComponent(kod)}` : "/logowanie"}
                    color="link-color"
                    size="sm"
                >
                    Zaloguj się
                </Button>
            </p>
        </div>
    );
}

export default function RejestracjaPage() {
    return (
        <Suspense>
            <RejestracjaForm />
        </Suspense>
    );
}
