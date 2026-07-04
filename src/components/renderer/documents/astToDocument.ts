import { DocumentModel } from "../types/document";

export function astToDocument(tree: any): DocumentModel {

    const doc: DocumentModel = {
        version: 1,
        blocks: []
    };

    return doc;

}