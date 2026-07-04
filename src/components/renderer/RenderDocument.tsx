import { DocumentModel, DocumentBlock } from "./types/document";

interface Props {

    document: DocumentModel;

}

export default function RenderDocument({

    document

}: Props) {

    return (

        <>

            {document.blocks.map((block: DocumentBlock) => (

                <div key={block.id}>

                    {block.type}

                </div>

            ))}

        </>

    );

}