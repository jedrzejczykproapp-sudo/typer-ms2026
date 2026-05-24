"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home01, Ticket01, Users01, User01 } from "@untitledui/icons";
import { cx } from "@/utils/cx";
import { Avatar } from "@/components/base/avatar/avatar";

interface Props {
    profileSrc?: string | null;
    profileInits?: string;
}

const mainItems = [
    { href: "/mecze",   label: "Mecze",   icon: Home01   },
    { href: "/zaklady", label: "Zakłady", icon: Ticket01 },
    { href: "/grupy",   label: "Grupy",   icon: Users01  },
];

export function AppNav({ profileSrc, profileInits = "?" }: Props) {
    const pathname = usePathname();

    const isProfileActive = pathname === "/konto" || pathname.startsWith("/konto/");

    return (
        <>
            {/* Desktop: sticky below header */}
            <nav className="sticky top-14 z-20 hidden border-b border-secondary bg-primary lg:block">
                <div className="flex h-11 items-center px-6">
                    {mainItems.map(({ href, label, icon: Icon }) => {
                        const isActive = pathname === href || pathname.startsWith(href + "/");
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={cx(
                                    "flex flex-1 items-center justify-center gap-2 py-1.5 text-sm font-medium transition duration-100",
                                    isActive
                                        ? "text-fg-brand-primary"
                                        : "text-quaternary hover:text-secondary",
                                )}
                            >
                                <Icon className="size-4 shrink-0" />
                                {label}
                            </Link>
                        );
                    })}
                    {/* Profil */}
                    <Link
                        href="/konto"
                        className={cx(
                            "flex flex-1 items-center justify-center gap-2 py-1.5 text-sm font-medium transition duration-100",
                            isProfileActive
                                ? "text-fg-brand-primary"
                                : "text-quaternary hover:text-secondary",
                        )}
                    >
                        <User01 className="size-4 shrink-0" />
                        Profil
                    </Link>
                </div>
            </nav>

            {/* Mobile: fixed bottom nav */}
            <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-secondary bg-primary lg:hidden">
                <div className="flex h-16 items-center justify-around px-2">
                    {mainItems.map(({ href, label, icon: Icon }) => {
                        const isActive = pathname === href || pathname.startsWith(href + "/");
                        return (
                            <Link
                                key={href}
                                href={href}
                                className="flex flex-1 flex-col items-center gap-1 py-2 outline-none"
                            >
                                <Icon
                                    className={cx(
                                        "size-5 transition duration-100",
                                        isActive ? "text-fg-brand-primary" : "text-fg-quaternary",
                                    )}
                                />
                                <span
                                    className={cx(
                                        "text-xs font-medium",
                                        isActive ? "text-brand-secondary" : "text-tertiary",
                                    )}
                                >
                                    {label}
                                </span>
                            </Link>
                        );
                    })}

                    {/* Profil — z avatarem jeśli dostępny */}
                    <Link
                        href="/konto"
                        className="flex flex-1 flex-col items-center gap-1 py-2 outline-none"
                    >
                        {profileSrc || profileInits !== "?" ? (
                            <Avatar
                                src={profileSrc ?? undefined}
                                initials={profileInits}
                                size="xs"
                                className={cx(
                                    "transition duration-100",
                                    isProfileActive
                                        ? "ring-2 ring-fg-brand-primary ring-offset-1"
                                        : "",
                                )}
                            />
                        ) : (
                            <User01
                                className={cx(
                                    "size-5 transition duration-100",
                                    isProfileActive ? "text-fg-brand-primary" : "text-fg-quaternary",
                                )}
                            />
                        )}
                        <span
                            className={cx(
                                "text-xs font-medium",
                                isProfileActive ? "text-brand-secondary" : "text-tertiary",
                            )}
                        >
                            Profil
                        </span>
                    </Link>
                </div>
            </nav>
        </>
    );
}
