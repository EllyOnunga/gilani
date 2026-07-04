import React from "react";
import { registry } from "./Registry";
import { DocumentModel } from "../types/document";

interface Props {
    document: DocumentModel;
}

export default function DocumentRenderer({ document }: Props) {
    return (
        <>
            {document.blocks.map((block) => {
                const Component = registry[block.type as keyof typeof registry] as
                    React.ComponentType<{ children?: React.ReactNode }> | undefined;

                if (!Component) return null;

                return (
                    <Component key={block.id}>
                        {block.content ?? null}
                    </Component>
                );
            })}
        </>
    );
}