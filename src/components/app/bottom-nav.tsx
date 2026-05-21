"use client";

import { usePathname } from "next/navigation";
import { BarChart01, Trophy01, Users01 } from "@untitledui/icons";
import { Link as AriaLink } from "react-aria-components";
import { cx } from "@/utils/cx";

const navItems = [
    { href: "/grupy", label: "Grupy", icon: Users01 },
    { href: "/grupy/typowania", label: "Typowania", icon: BarChart01 },
    { href: "/grupy/tabela", label: "Tabela", icon: Trophy01 },
];

export function BottomNav({ groupId }: { groupId?: string }) {
    const pathname = usePathname();

    const items = groupId
        ? [
              { href: "/grupy", label: "Grupy", icon: Users01 },
              { href: `/grupy/${groupId}?tab=typowania`, label: "Typowania", icon: BarChart01 },
              { href: `/grupy/${groupId}?tab=tabela`, label: "Tabela", icon: Trophy01 },
          ]
        : [{ href: "/grupy", label: "Grupy", icon: Users01 }];

    return (
        <nav className="fixed right-0 bottom-0 left-0 z-40 border-t border-secondary bg-primary lg:hidden">
            <div className="flex h-16 items-center justify-around px-2">
                {items.map(({ href, label, icon: Icon }) => {
                    const isActive = pathname === href.split("?")[0];
                    return (
                        <AriaLink
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
                        </AriaLink>
                    );
                })}
            </div>
        </nav>
    );
}
