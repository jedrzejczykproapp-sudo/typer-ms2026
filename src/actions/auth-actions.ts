"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
        email: formData.get("email") as string,
        password: formData.get("password") as string,
    });

    if (error) return { error: error.message };

    const redirectTo = formData.get("redirect_to") as string | null;
    redirect(redirectTo?.startsWith("/") ? redirectTo : "/konto");
}

export async function signUp(formData: FormData) {
    const supabase = await createClient();

    const { error } = await supabase.auth.signUp({
        email: formData.get("email") as string,
        password: formData.get("password") as string,
        options: {
            data: {
                display_name: formData.get("display_name") as string,
            },
        },
    });

    if (error) return { error: error.message };

    const redirectTo = formData.get("redirect_to") as string | null;
    redirect(redirectTo?.startsWith("/") ? redirectTo : "/konto");
}

export async function signOut() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/logowanie");
}

export async function updateProfile(displayName: string, avatarUrl?: string | null) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Nie jesteś zalogowany" };

    const trimmed = displayName.trim();
    if (!trimmed) return { error: "Podaj imię" };

    const update: Record<string, unknown> = { display_name: trimmed };
    if (avatarUrl !== undefined) update.avatar_url = avatarUrl;

    const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
    if (error) return { error: error.message };

    revalidatePath("/konto");
    revalidatePath("/", "layout");
    return { success: true };
}

export async function deleteAccount() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Nie jesteś zalogowany" };

    // Remove user data
    await supabase.from("predictions").delete().eq("user_id", user.id);
    await supabase.from("group_members").delete().eq("user_id", user.id);
    await supabase.from("profiles").delete().eq("id", user.id);
    await supabase.auth.signOut();

    redirect("/logowanie");
}
