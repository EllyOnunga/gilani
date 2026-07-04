export interface RendererPlugin {

    name: string;

    test(node: any): boolean;

    transform(node: any): any;

}