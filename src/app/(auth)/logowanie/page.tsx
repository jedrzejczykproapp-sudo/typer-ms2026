"use client";

import { useState } from "react";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { signIn } from "@/actions/auth-actions";
import { Logo } from "@/components/app/logo";

export default function LogowaniePage() {
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

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
                <p className="text-sm text-tertiary">Zaloguj się do swojego konta</p>
            </div>

            <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
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
                <Button href="/rejestracja" color="link-color" size="sm">
                    Zarejestruj się
                </Button>
            </p>
        </div>
    );
}
