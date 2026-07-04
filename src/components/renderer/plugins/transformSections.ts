export function transformSections(sections: any[]) {

    return sections.map(section => {

        const title =

            section.heading.children[0].value

                .trim()

                .toLowerCase();

        return {

            type: "gilani",

            component: title,

            children: section.children

        };

    });

}