"use client";

import { useRef, useState } from "react";
import { Camera01, Check, ChevronLeft, Copy01, DotsVertical, Edit01, Trash01, Users01, X } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Input } from "@/components/base/input/input";
import { Avatar } from "@/components/base/avatar/avatar";
import { useClipboard } from "@/hooks/use-clipboard";
import { createClient } from "@/lib/supabase/client";
import { getGroupMembers, removeMember, renameGroup } from "@/actions/group-actions";
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
    currentAvatarUrl: string | null;
    isAdmin: boolean;
    currentUserId: string;
    createdBy: string;
}

type Sheet = "options" | "edit" | "members";

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
    currentAvatarUrl,
    isAdmin,
    currentUserId,
    createdBy,
}: GroupSettingsMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [sheet, setSheet] = useState<Sheet>("options");
    const [members, setMembers] = useState<Member[]>([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(currentAvatarUrl);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const clipboard = useClipboard();
    const supabase = createClient();

    function openSheet() {
        setSheet("options");
        setIsOpen(true);
    }

    function close() {
        setIsOpen(false);
    }

    function openEdit() {
        setAvatarPreview(currentAvatarUrl);
        setAvatarFile(null);
        setSaveError(null);
        setSheet("edit");
    }

    async function openMembers() {
        setSheet("members");
        setMembersLoading(true);
        const data = await getGroupMembers(groupId);
        setMembers(data as unknown as Member[]);
        setMembersLoading(false);
    }

    function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
        e.target.value = "";
    }

    async function handleSave(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaveError(null);
        setIsSaving(true);

        const fd = new FormData(e.currentTarget);
        let avatarUrl: string | null | undefined = undefined;

        if (avatarFile) {
            const ext = avatarFile.name.split(".").pop() ?? "jpg";
            const path = `${groupId}/${Date.now()}.${ext}`;
            const { data, error } = await supabase.storage
                .from("group-avatars")
                .upload(path, avatarFile, { contentType: avatarFile.type, upsert: true });
            if (error) {
                setSaveError("Błąd wgrywania zdjęcia");
                setIsSaving(false);
                return;
            }
            const { data: { publicUrl } } = supabase.storage.from("group-avatars").getPublicUrl(data.path);
            avatarUrl = publicUrl;
        }

        const result = await renameGroup(groupId, fd.get("name") as string, avatarUrl);
        setIsSaving(false);
        if (result?.error) {
            setSaveError(result.error);
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
        edit: "Edytuj grupę",
        members: "Członkowie",
    };

    return (
        <>
            <ButtonUtility
                icon={DotsVertical}
                color="secondary"
                size="sm"
                tooltip="Ustawienia grupy"
                onClick={openSheet}
            />

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-50 bg-overlay/50" onClick={close} />

                    <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-2xl rounded-t-2xl bg-primary shadow-xl ring-1 ring-secondary">
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

                        <div className="px-4 py-3 pb-8">
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
                                            onClick={openEdit}
                                            className="flex items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-secondary"
                                        >
                                            <Edit01 className="size-5 shrink-0 text-fg-tertiary" />
                                            <p className="text-sm font-medium text-primary">Edytuj grupę</p>
                                        </button>
                                    )}

                                    <button
                                        onClick={openMembers}
                                        className="flex items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-secondary"
                                    >
                                        <Users01 className="size-5 shrink-0 text-fg-tertiary" />
                                        <p className="text-sm font-medium text-primary">Członkowie grupy</p>
                                    </button>
                                </div>
                            )}

                            {sheet === "edit" && (
                                <form onSubmit={handleSave} className="flex flex-col gap-4">
                                    <div className="flex flex-col items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="group relative size-20 shrink-0 overflow-hidden rounded-2xl bg-secondary"
                                        >
                                            {avatarPreview ? (
                                                <img src={avatarPreview} alt="Avatar" className="size-full object-cover" />
                                            ) : (
                                                <div className="flex size-full items-center justify-center text-2xl font-bold text-tertiary">
                                                    {groupName.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                                                <Camera01 className="size-6 text-white" />
                                            </div>
                                        </button>
                                        <p className="text-xs text-tertiary">Kliknij aby zmienić zdjęcie grupy</p>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleAvatarChange}
                                        />
                                    </div>

                                    <Input name="name" label="Nazwa grupy" defaultValue={groupName} isRequired />

                                    {saveError && (
                                        <p className="rounded-lg bg-error-primary px-3 py-2 text-sm text-error-primary">
                                            {saveError}
                                        </p>
                                    )}
                                    <Button type="submit" isLoading={isSaving} showTextWhileLoading className="w-full">
                                        Zapisz
                                    </Button>
                                </form>
                            )}

                            {sheet === "members" && (
                                <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
                                    {membersLoading ? (
                                        <p className="py-6 text-center text-sm text-tertiary">Ładowanie...</p>
                                    ) : (
                                        members.map((member) => {
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
                                                            {isMe && <span className="ml-1 text-xs text-tertiary">(Ty)</span>}
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
                                        })
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
