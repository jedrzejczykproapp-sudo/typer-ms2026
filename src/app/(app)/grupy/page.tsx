import { ChevronRight, Users01 } from "@untitledui/icons";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CreateGroupModal } from "@/components/app/group-modals";
import { JoinGroupModal } from "@/components/app/group-modals";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";

export default async function GrupyPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { data: memberships } = await supabase
        .from("group_members")
        .select("group_id, groups(id, name, invite_code, created_at)")
        .eq("user_id", user!.id)
        .order("joined_at", { ascending: false });

    const groups = memberships?.map((m) => m.groups).filter(Boolean) ?? [];

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-xl font-bold text-primary">Twoje grupy</h1>
                <p className="mt-1 text-sm text-tertiary">Typuj wyniki z przyjaciółmi i sprawdzaj kto jest najlepszy.</p>
            </div>

            <div className="flex gap-3">
                <CreateGroupModal />
                <JoinGroupModal />
            </div>

            {groups.length === 0 ? (
                <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-secondary bg-primary py-16 text-center">
                    <FeaturedIcon icon={Users01} color="brand" theme="light" size="lg" />
                    <div>
                        <p className="font-semibold text-primary">Brak grup</p>
                        <p className="mt-1 text-sm text-tertiary">Utwórz nową grupę lub dołącz do istniejącej.</p>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {groups.map((group: any) => (
                        <Link
                            key={group.id}
                            href={`/grupy/${group.id}`}
                            className="flex items-center gap-3 rounded-xl border border-secondary bg-primary px-4 py-3 shadow-xs transition hover:bg-primary_hover"
                        >
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-secondary text-xl">
                                🏆
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold text-primary">{group.name}</p>
                                <p className="text-xs text-tertiary">Kod: {group.invite_code}</p>
                            </div>
                            <ChevronRight className="size-4 text-fg-quaternary" />
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
