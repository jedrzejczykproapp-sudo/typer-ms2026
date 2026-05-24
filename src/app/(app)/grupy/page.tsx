import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Users01 } from "@untitledui/icons";
import { createClient } from "@/lib/supabase/server";
import { CreateGroupModal } from "@/components/app/group-modals";
import { JoinGroupModal } from "@/components/app/group-modals";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";

export default async function GrupyPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/logowanie");

    const { data: memberships } = await supabase
        .from("group_members")
        .select("group_id, groups(id, name, avatar_url)")
        .eq("user_id", user.id)
        .order("joined_at", { ascending: false });

    const groups = (memberships?.map((m) => m.groups).filter(Boolean) ?? []) as unknown as {
        id: string;
        name: string;
        avatar_url: string | null;
    }[];

    // Fetch member counts
    const { data: memberRows } = groups.length
        ? await supabase
              .from("group_members")
              .select("group_id")
              .in("group_id", groups.map((g) => g.id))
        : { data: [] };

    const countMap = new Map<string, number>();
    (memberRows ?? []).forEach((r) =>
        countMap.set(r.group_id, (countMap.get(r.group_id) ?? 0) + 1),
    );

    return (
        <div className="flex flex-col gap-5">
            <h1 className="text-lg font-bold text-primary">Grupy</h1>

            {/* Buttons in one row */}
            <div className="flex gap-3">
                <CreateGroupModal buttonClassName="flex-1" />
                <JoinGroupModal buttonClassName="flex-1" />
            </div>

            {/* Groups list */}
            {groups.length === 0 ? (
                <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-secondary bg-primary py-16 text-center">
                    <FeaturedIcon icon={Users01} color="brand" theme="light" size="lg" />
                    <div>
                        <p className="font-semibold text-primary">Brak grup</p>
                        <p className="mt-1 text-sm text-tertiary">
                            Utwórz nową grupę lub dołącz do istniejącej.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {groups.map((group) => {
                        const memberCount = countMap.get(group.id) ?? 0;
                        return (
                            <Link
                                key={group.id}
                                href={`/grupy/${group.id}`}
                                className="flex items-center gap-3 rounded-xl border border-secondary bg-primary px-4 py-3 shadow-xs transition hover:bg-primary_hover"
                            >
                                <div
                                    className={`size-10 shrink-0 overflow-hidden rounded-lg ${
                                        group.avatar_url ? "bg-secondary" : "border border-secondary"
                                    }`}
                                >
                                    {group.avatar_url ? (
                                        <img
                                            src={group.avatar_url}
                                            alt={group.name}
                                            className="size-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex size-full items-center justify-center text-lg font-bold text-tertiary">
                                            {group.name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold text-primary">{group.name}</p>
                                    <p className="text-xs text-tertiary">
                                        {memberCount}{" "}
                                        {memberCount === 1 ? "uczestnik" : "uczestników"}
                                    </p>
                                </div>
                                <ChevronRight className="size-4 text-fg-quaternary" />
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
