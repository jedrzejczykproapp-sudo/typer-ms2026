"use client";

import { useState } from "react";
import { Plus, Users01, X } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { createGroup, joinGroup } from "@/actions/group-actions";

function ModalContent({
    title,
    onClose,
    children,
}: {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
}) {
    return (
        <div className="w-full max-w-md rounded-2xl bg-primary shadow-xl ring-1 ring-secondary">
            <div className="flex items-center justify-between border-b border-secondary px-6 py-4">
                <h2 className="text-lg font-semibold text-primary">{title}</h2>
                <Button color="tertiary" size="sm" onClick={onClose} type="button">
                    <X className="size-4" data-icon />
                </Button>
            </div>
            {children}
        </div>
    );
}

export function CreateGroupModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        const result = await createGroup(new FormData(e.currentTarget));
        if (result?.error) {
            setError(result.error);
            setIsLoading(false);
        }
    }

    return (
        <DialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
            <Button iconLeading={Plus} onClick={() => setIsOpen(true)} size="md">
                Utwórz grupę
            </Button>
            <ModalOverlay>
                <Modal>
                    <Dialog>
                        <ModalContent title="Nowa grupa" onClose={() => setIsOpen(false)}>
                            <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
                                <p className="text-sm text-tertiary">
                                    Utwórz prywatną grupę i zaproś znajomych unikalnym kodem.
                                </p>
                                <Input name="name" label="Nazwa grupy" placeholder="np. Drużyna z biura" isRequired />
                                {error && (
                                    <p className="rounded-lg bg-error-primary px-3 py-2 text-sm text-error-primary">
                                        {error}
                                    </p>
                                )}
                                <div className="flex justify-end gap-3">
                                    <Button color="secondary" onClick={() => setIsOpen(false)} type="button">
                                        Anuluj
                                    </Button>
                                    <Button type="submit" isLoading={isLoading} showTextWhileLoading>
                                        Utwórz
                                    </Button>
                                </div>
                            </form>
                        </ModalContent>
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </DialogTrigger>
    );
}

export function JoinGroupModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        const result = await joinGroup(new FormData(e.currentTarget));
        if (result?.error) {
            setError(result.error);
            setIsLoading(false);
        }
    }

    return (
        <DialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
            <Button iconLeading={Users01} color="secondary" onClick={() => setIsOpen(true)} size="md">
                Dołącz do grupy
            </Button>
            <ModalOverlay>
                <Modal>
                    <Dialog>
                        <ModalContent title="Dołącz do grupy" onClose={() => setIsOpen(false)}>
                            <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
                                <p className="text-sm text-tertiary">
                                    Wpisz 6-znakowy kod zaproszenia otrzymany od administratora grupy.
                                </p>
                                <Input
                                    name="invite_code"
                                    label="Kod zaproszenia"
                                    placeholder="np. AB1CD2"
                                    isRequired
                                    maxLength={6}
                                />
                                {error && (
                                    <p className="rounded-lg bg-error-primary px-3 py-2 text-sm text-error-primary">
                                        {error}
                                    </p>
                                )}
                                <div className="flex justify-end gap-3">
                                    <Button color="secondary" onClick={() => setIsOpen(false)} type="button">
                                        Anuluj
                                    </Button>
                                    <Button type="submit" isLoading={isLoading} showTextWhileLoading>
                                        Dołącz
                                    </Button>
                                </div>
                            </form>
                        </ModalContent>
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </DialogTrigger>
    );
}
