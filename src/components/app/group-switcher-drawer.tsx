"use client";

import { useState } from "react";
import { Check, ChevronDown, X } from "@untitledui/icons";
import { useRouter } from "next/navigation";
import { cx } from "@/utils/cx";

interface GroupItem {
    id: string;
    name: string;
    avatar_url: string | null;
}

interface GroupSwitcherDrawerProps {
    currentGroupId: string;
    currentGroupName: string;
    currentGroupAvatar: string | null;
    memberCount: number;
    groups: GroupItem[];
}

export function GroupSwitcherDrawer({
    currentGroupId,
    currentGroupName,
    currentGroupAvatar,
    memberCount,
    groups,
}: GroupSwitcherDrawerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();

    function handleSelect(groupId: string) {
        setIsOpen(false);
        if (groupId !== currentGroupId) {
            router.push(`/grupy/${groupId}`);
        }
    }

    return (
        <>
            {/* Clickable group header */}
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-3 text-left"
            >
                <div className={`size-12 shrink-0 overflow-hidden rounded-xl ${currentGroupAvatar ? "bg-secondary" : "border border-secondary"}`}>
                    {currentGroupAvatar ? (
                        <img src={currentGroupAvatar} alt={currentGroupName} className="size-full object-cover" />
                    ) : (
                        <div className="flex size-full items-center justify-center text-xl font-bold text-tertiary">
                            {currentGroupName.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-1">
                        <h1 className="truncate text-xl font-bold text-primary">{currentGroupName}</h1>
                        {groups.length > 1 && (
                            <ChevronDown className="size-5 shrink-0 text-fg-quaternary" />
                        )}
                    </div>
                    <p className="mt-0.5 text-xs text-tertiary">{memberCount} uczestników</p>
                </div>
            </button>

            {/* Bottom sheet */}
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-50 bg-overlay/50" onClick={() => setIsOpen(false)} />
                    <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-2xl rounded-t-2xl bg-primary shadow-xl ring-1 ring-secondary">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-secondary px-4 py-3">
                            <span className="text-sm font-semibold text-primary">Moje grupy</span>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="rounded-lg p-1.5 text-fg-quaternary hover:bg-secondary hover:text-fg-tertiary"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        {/* Group list */}
                        <div className="max-h-[60dvh] overflow-y-auto px-2 py-2 pb-8">
                            {groups.map((group) => {
                                const isActive = group.id === currentGroupId;
                                return (
                                    <button
                                        key={group.id}
                                        type="button"
                                        onClick={() => handleSelect(group.id)}
                                        className={cx(
                                            "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition",
                                            isActive ? "bg-secondary" : "hover:bg-secondary",
                                        )}
                                    >
                                        {/* Avatar */}
                                        <div className={`size-10 shrink-0 overflow-hidden rounded-lg ${group.avatar_url ? "bg-secondary_hover" : "border border-secondary"}`}>
                                            {group.avatar_url ? (
                                                <img src={group.avatar_url} alt={group.name} className="size-full object-cover" />
                                            ) : (
                                                <div className="flex size-full items-center justify-center text-base font-bold text-tertiary">
                                                    {group.name.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>

                                        <span className={cx("min-w-0 flex-1 truncate text-sm font-medium", isActive ? "text-primary" : "text-secondary")}>
                                            {group.name}
                                        </span>

                                        {isActive && (
                                            <Check className="size-5 shrink-0 text-brand-solid" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
