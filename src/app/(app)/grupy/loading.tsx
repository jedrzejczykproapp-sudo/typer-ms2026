function Skel({ className }: { className?: string }) {
    return <div className={`rounded-lg bg-secondary ${className ?? ""}`} />;
}

function GroupItemSkeleton() {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-secondary bg-primary px-4 py-3 shadow-xs">
            <Skel className="size-10 shrink-0 rounded-lg" />
            <div className="flex flex-1 flex-col gap-2">
                <Skel className="h-4 w-36" />
                <Skel className="h-3 w-24" />
            </div>
            <Skel className="size-4" />
        </div>
    );
}

export default function Loading() {
    return (
        <div className="flex animate-pulse flex-col gap-6">
            <div className="flex flex-col gap-2.5">
                <Skel className="h-7 w-44" />
                <Skel className="h-4 w-72" />
            </div>

            <div className="flex gap-3">
                <Skel className="h-10 w-40 rounded-xl" />
                <Skel className="h-10 w-40 rounded-xl" />
            </div>

            <div className="flex flex-col gap-2">
                {[0, 1, 2].map((i) => (
                    <GroupItemSkeleton key={i} />
                ))}
            </div>
        </div>
    );
}
