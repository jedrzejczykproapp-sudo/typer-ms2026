import { cx } from "@/utils/cx";

interface LogoProps {
    className?: string;
    height?: number;
}

export function Logo({ className, height = 18 }: LogoProps) {
    const width = Math.round((183 / 20) * height);
    return (
        <>
            {/* Light mode logo (dark text) */}
            <img
                src="/logo-light.svg"
                width={width}
                height={height}
                alt="Logo"
                className={cx("shrink-0 block dark:hidden", className)}
            />
            {/* Dark mode logo (white text) */}
            <img
                src="/logo-dark.svg"
                width={width}
                height={height}
                alt="Logo"
                className={cx("shrink-0 hidden dark:block", className)}
            />
        </>
    );
}
