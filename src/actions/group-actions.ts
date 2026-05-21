"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createGroup(formData: FormData) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: "Nie jesteś zalogowany" };

    const name = (formData.get("name") as string).trim();
    if (!name) return { error: "Podaj nazwę grupy" };

    const { data: group, error } = await supabase.from("groups").insert({ name, created_by: user.id }).select().single();

    if (error) return { error: error.message };

    await supabase.from("group_members").insert({ group_id: group.id, user_id: user.id });

    revalidatePath("/grupy");
    redirect(`/grupy/${group.id}`);
}

export async function joinGroup(formData: FormData) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: "Nie jesteś zalogowany" };

    const inviteCode = (formData.get("invite_code") as string).trim().toUpperCase();
    if (!inviteCode) return { error: "Podaj kod zaproszenia" };

    const { data: group, error: groupError } = await supabase.from("groups").select("id").eq("invite_code", inviteCode).single();

    if (groupError || !group) return { error: "Nie znaleziono grupy z tym kodem" };

    const { error: memberError } = await supabase.from("group_members").insert({ group_id: group.id, user_id: user.id });

    if (memberError) {
        if (memberError.code === "23505") return { error: "Jesteś już w tej grupie" };
        return { error: memberError.message };
    }

    revalidatePath("/grupy");
    redirect(`/grupy/${group.id}`);
}

export async function getUserGroups() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    const { data } = await supabase
        .from("group_members")
        .select("group_id, groups(id, name, invite_code, created_at)")
        .eq("user_id", user.id)
        .order("joined_at", { ascending: false });

    return data?.map((m) => m.groups).filter(Boolean) ?? [];
}

export async function renameGroup(groupId: string, name: string, avatarUrl?: string | null) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: "Nie jesteś zalogowany" };

    const { data: group } = await supabase.from("groups").select("created_by").eq("id", groupId).single();
    if (!group || group.created_by !== user.id) return { error: "Brak uprawnień" };

    const trimmed = name.trim();
    if (!trimmed) return { error: "Podaj nazwę grupy" };

    const update: Record<string, unknown> = { name: trimmed };
    if (avatarUrl !== undefined) update.avatar_url = avatarUrl;

    const { error } = await supabase.from("groups").update(update).eq("id", groupId);
    if (error) return { error: error.message };

    revalidatePath(`/grupy/${groupId}`);
    revalidatePath("/grupy");
    return { success: true };
}

export async function removeMember(groupId: string, memberId: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: "Nie jesteś zalogowany" };

    const { data: group } = await supabase.from("groups").select("created_by").eq("id", groupId).single();
    if (!group || group.created_by !== user.id) return { error: "Brak uprawnień" };
    if (memberId === user.id) return { error: "Nie możesz usunąć siebie z grupy" };

    const { error } = await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", memberId);
    if (error) return { error: error.message };

    revalidatePath(`/grupy/${groupId}`);
    return { success: true };
}

export async function getGroupMembers(groupId: string) {
    const supabase = await createClient();

    const { data: members } = await supabase
        .from("group_members")
        .select("user_id, joined_at")
        .eq("group_id", groupId);

    if (!members?.length) return [];

    const userIds = members.map((m) => m.user_id);

    const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    return members.map((m) => ({
        user_id: m.user_id,
        joined_at: m.joined_at,
        profiles: profileMap.get(m.user_id) ?? null,
    }));
}

export async function deleteGroup(groupId: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: "Nie jesteś zalogowany" };

    const { data: group } = await supabase.from("groups").select("created_by").eq("id", groupId).single();
    if (!group || group.created_by !== user.id) return { error: "Brak uprawnień" };

    const { error } = await supabase.from("groups").delete().eq("id", groupId);
    if (error) return { error: error.message };

    revalidatePath("/grupy");
    return { success: true };
}

export async function leaveGroup(groupId: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: "Nie jesteś zalogowany" };

    const { data: group } = await supabase.from("groups").select("created_by").eq("id", groupId).single();
    if (group?.created_by === user.id) return { error: "Admin nie może opuścić grupy — usuń grupę lub przekaż prawa." };

    const { error } = await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", user.id);
    if (error) return { error: error.message };

    revalidatePath("/grupy");
    return { success: true };
}

export async function getGroupWithMembers(groupId: string) {
    const supabase = await createClient();

    const [{ data: group }, { data: members }] = await Promise.all([
        supabase.from("groups").select("*").eq("id", groupId).single(),
        supabase.from("group_members").select("user_id, joined_at, profiles(id, display_name, avatar_url)").eq("group_id", groupId),
    ]);

    return { group, members: members ?? [] };
}
