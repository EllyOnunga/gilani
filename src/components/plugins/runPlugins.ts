import { RendererPlugin } from "./types";

export function runPlugins(
    node: any,
    plugins: RendererPlugin[]
) {

    let current = node;

    plugins.forEach(plugin => {

        if (plugin.test(current)) {

            current = plugin.transform(current);

        }

    });

    return current;

}