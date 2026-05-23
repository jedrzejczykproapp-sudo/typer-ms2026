"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home01, Ticket01 } from "@untitledui/icons";
import { cx } from "@/utils/cx";

const items = [
    { href: "/mecze", label: "Mecze", icon: Home01 },
    { href: "/zaklady", label: "Zakłady", icon: Ticket01 },
];

export function AppNav() {
    const pathname = usePathname();

    return (
        <>
            {/* Desktop: sticky below header (top-14 = header height 56px) */}
            <nav className="sticky top-14 z-20 hidden border-b border-secondary bg-primary lg:block">
                <div className="mx-auto flex h-11 max-w-2xl items-center gap-1 px-4">
                    {items.map(({ href, label, icon: Icon }) => {
                        const isActive = pathname === href || pathname.startsWith(href + "/");
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={cx(
                                    "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition duration-100",
                                    isActive
                                        ? "bg-secondary text-fg-brand-primary"
                                        : "text-tertiary hover:bg-secondary hover:text-secondary",
                                )}
                            >
                                <Icon className="size-4 shrink-0" />
                                {label}
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Mobile / tablet: fixed bottom nav */}
            <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-secondary bg-primary lg:hidden">
                <div className="flex h-16 items-center justify-around px-2">
                    {items.map(({ href, label, icon: Icon }) => {
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
                </div>
            </nav>
        </>
    );
}
