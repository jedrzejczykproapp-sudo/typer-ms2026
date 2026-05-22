import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { joinGroupByCode } from "@/actions/group-actions";

export default async function DolaczPage({
    searchParams,
}: {
    searchParams: Promise<{ kod?: string }>;
}) {
    const { kod } = await searchParams;

    if (!kod) redirect("/konto");

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        // Not logged in — send to registration with the invite code so it's preserved
        redirect(`/rejestracja?kod=${encodeURIComponent(kod)}`);
    }

    // Logged in — join and redirect to group
    const result = await joinGroupByCode(kod);

    if (result.error === "invalid_code") redirect("/konto");
    if (result.error) redirect("/konto");

    redirect(`/grupy/${(result as { success: true; groupId: string }).groupId}`);
}
