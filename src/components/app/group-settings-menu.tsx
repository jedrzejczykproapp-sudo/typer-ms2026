"use client";

import { useEffect, useState } from "react";
import { Check, ChevronLeft, Copy01, Edit01, Trash01, Users01, X } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Avatar } from "@/components/base/avatar/avatar";
import { useClipboard } from "@/hooks/use-clipboard";
import { removeMember, renameGroup } from "@/actions/group-actions";
import { cx } from "@/utils/cx";

interface Member {
    user_id: string;
    joined_at: string;
    profiles: { id: string; display_name: string | null; avatar_url: string | null } | null;
}

interface GroupSettingsMenuProps {
    groupId: string;
    inviteCode: string;
    groupName: string;
    isAdmin: boolean;
    currentUserId: string;
    members: Member[];
    createdBy: string;
}

type Sheet = "options" | "rename" | "members";

function initials(name: string | null) {
    return (name ?? "?")
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

export function GroupSettingsMenu({
    groupId,
    inviteCode,
    groupName,
    isAdmin,
    currentUserId,
    members: initialMembers,
    createdBy,
}: GroupSettingsMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [sheet, setSheet] = useState<Sheet>("options");
    const [members, setMembers] = useState(initialMembers);
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameError, setRenameError] = useState<string | null>(null);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const clipboard = useClipboard();

    // Sync members when server re-renders with fresh data
    useEffect(() => {
        setMembers(initialMembers);
    }, [initialMembers.length]);

    function openSheet() {
        setSheet("options");
        setIsOpen(true);
    }

    function close() {
        setIsOpen(false);
    }

    async function handleRename(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setRenameError(null);
        setIsRenaming(true);
        const fd = new FormData(e.currentTarget);
        const result = await renameGroup(groupId, fd.get("name") as string);
        setIsRenaming(false);
        if (result?.error) {
            setRenameError(result.error);
        } else {
            close();
        }
    }

    async function handleRemoveMember(memberId: string) {
        setRemovingId(memberId);
        const result = await removeMember(groupId, memberId);
        if (!result?.error) {
            setMembers((prev) => prev.filter((m) => m.user_id !== memberId));
        }
        setRemovingId(null);
    }

    const sheetTitles: Record<Sheet, string> = {
        options: "Ustawienia grupy",
        rename: "Edytuj nazwę",
        members: "Członkowie",
    };

    return (
        <>
            {/* Trigger button — three dots */}
            <button
                onClick={openSheet}
                className="flex size-8 items-center justify-center rounded-lg text-fg-quaternary transition hover:bg-secondary hover:text-fg-tertiary"
                aria-label="Ustawienia grupy"
            >
                <span className="text-lg leading-none tracking-widest">···</span>
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-50 bg-overlay/50" onClick={close} />

                    {/* Bottom sheet */}
                    <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-2xl rounded-t-2xl bg-primary shadow-xl ring-1 ring-secondary">
                        {/* Header */}
                        <div className="flex items-center gap-2 border-b border-secondary px-4 py-3">
                            {sheet !== "options" && (
                                <button
                                    onClick={() => setSheet("options")}
                                    className="flex items-center gap-1 text-sm text-tertiary hover:text-secondary"
                                >
                                    <ChevronLeft className="size-4" />
                                </button>
                            )}
                            <span className="flex-1 text-sm font-semibold text-primary">{sheetTitles[sheet]}</span>
                            <button
                                onClick={close}
                                className="rounded-lg p-1 text-fg-quaternary hover:bg-secondary hover:text-fg-tertiary"
                            >
                                <X className="size-4" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="px-4 py-3 pb-8">
                            {/* Main options */}
                            {sheet === "options" && (
                                <div className="flex flex-col">
                                    <button
                                        onClick={() => clipboard.copy(inviteCode)}
                                        className="flex items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-secondary"
                                    >
                                        {clipboard.copied ? (
                                            <Check className="size-5 shrink-0 text-success-primary" />
                                        ) : (
                                            <Copy01 className="size-5 shrink-0 text-fg-tertiary" />
                                        )}
                                        <div>
                                            <p className="text-sm font-medium text-primary">
                                                {clipboard.copied ? "Skopiowano!" : "Skopiuj kod zaproszenia"}
                                            </p>
                                            <p className="font-mono text-xs tracking-widest text-tertiary">{inviteCode}</p>
                                        </div>
                                    </button>

                                    {isAdmin && (
                                        <button
                                            onClick={() => setSheet("rename")}
                                            className="flex items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-secondary"
                                        >
                                            <Edit01 className="size-5 shrink-0 text-fg-tertiary" />
                                            <p className="text-sm font-medium text-primary">Edytuj nazwę grupy</p>
                                        </button>
                                    )}

                                    <button
                                        onClick={() => setSheet("members")}
                                        className="flex items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-secondary"
                                    >
                                        <Users01 className="size-5 shrink-0 text-fg-tertiary" />
                                        <div>
                                            <p className="text-sm font-medium text-primary">Członkowie grupy</p>
                                            <p className="text-xs text-tertiary">{members.length} uczestników</p>
                                        </div>
                                    </button>
                                </div>
                            )}

                            {/* Rename form */}
                            {sheet === "rename" && (
                                <form onSubmit={handleRename} className="flex flex-col gap-4">
                                    <Input name="name" label="Nazwa grupy" defaultValue={groupName} isRequired />
                                    {renameError && (
                                        <p className="rounded-lg bg-error-primary px-3 py-2 text-sm text-error-primary">
                                            {renameError}
                                        </p>
                                    )}
                                    <Button type="submit" isLoading={isRenaming} showTextWhileLoading className="w-full">
                                        Zapisz
                                    </Button>
                                </form>
                            )}

                            {/* Members list */}
                            {sheet === "members" && (
                                <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
                                    {members.map((member) => {
                                        const name = (member.profiles as any)?.display_name ?? "Anonim";
                                        const isCreator = member.user_id === createdBy;
                                        const isMe = member.user_id === currentUserId;
                                        const canRemove = isAdmin && !isCreator && !isMe;

                                        return (
                                            <div key={member.user_id} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
                                                <Avatar initials={initials(name)} size="sm" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium text-primary">
                                                        {name}
                                                        {isMe && (
                                                            <span className="ml-1 text-xs text-tertiary">(Ty)</span>
                                                        )}
                                                    </p>
                                                    {isCreator && (
                                                        <p className="text-xs font-medium text-brand-secondary">Admin</p>
                                                    )}
                                                </div>
                                                {canRemove && (
                                                    <button
                                                        onClick={() => handleRemoveMember(member.user_id)}
                                                        disabled={removingId === member.user_id}
                                                        className={cx(
                                                            "rounded-lg p-1.5 text-fg-quaternary transition",
                                                            "hover:bg-error-primary hover:text-error-primary",
                                                            "disabled:cursor-not-allowed disabled:opacity-40",
                                                        )}
                                                        aria-label={`Usuń ${name}`}
                                                    >
                                                        <Trash01 className="size-4" />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
