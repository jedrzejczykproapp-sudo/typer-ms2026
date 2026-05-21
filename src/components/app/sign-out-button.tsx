"use client";

import { LogOut01 } from "@untitledui/icons";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { signOut } from "@/actions/auth-actions";

export function SignOutButton() {
    return (
        <form action={signOut}>
            <ButtonUtility color="tertiary" size="sm" tooltip="Wyloguj" icon={LogOut01} type="submit" />
        </form>
    );
}
