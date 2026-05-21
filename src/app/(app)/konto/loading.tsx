function Skel({ className }: { className?: string }) {
    return <div className={`rounded-lg bg-secondary ${className ?? ""}`} />;
}

function PredictionCardSkeleton() {
    return (
        <div className="flex flex-col gap-4 rounded-xl border border-secondary bg-primary p-4">
            <div className="flex items-center justify-between">
                <Skel className="h-3.5 w-36" />
                <Skel className="h-3.5 w-28" />
            </div>
            <div className="flex items-center gap-3">
                <div className="flex flex-1 justify-center">
                    <Skel className="h-11 w-[132px] rounded-xl" />
                </div>
                <div className="flex w-8 shrink-0 justify-center">
                    <Skel className="h-5 w-3" />
                </div>
                <div className="flex flex-1 justify-center">
                    <Skel className="h-11 w-[132px] rounded-xl" />
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="flex flex-1 items-center justify-center gap-2.5">
                    <Skel className="size-8 shrink-0 rounded-lg" />
                    <Skel className="h-4 w-20" />
                </div>
                <div className="w-8 shrink-0" />
                <div className="flex flex-1 items-center justify-center gap-2.5">
                    <Skel className="size-8 shrink-0 rounded-lg" />
                    <Skel className="h-4 w-20" />
                </div>
            </div>
            <Skel className="h-9 w-full rounded-xl" />
        </div>
    );
}

export default function Loading() {
    return (
        <div className="flex animate-pulse flex-col gap-3">
            {/* 2-tab switcher */}
            <div className="flex gap-1 rounded-xl bg-secondary p-1">
                <Skel className="h-9 flex-1 rounded-lg" />
                <Skel className="h-9 flex-1 rounded-lg" />
            </div>

            {/* Group header */}
            <div className="flex items-center justify-between">
                <Skel className="h-3.5 w-24" />
                <Skel className="h-3.5 w-28" />
            </div>

            {/* Matches */}
            <div className="flex flex-col gap-8">
                <section>
                    <Skel className="mb-3 h-3.5 w-20" />
                    <div className="flex flex-col gap-3">
                        {[0, 1, 2].map((i) => (
                            <PredictionCardSkeleton key={i} />
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
