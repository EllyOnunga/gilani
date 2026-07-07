interface Section {
  heading: any;

  children: any[];
}

export function groupSections(children: any[]) {
  const sections: Section[] = [];

  let current: Section | null = null;

  children.forEach((node) => {
    if (node.type === "heading") {
      current = {
        heading: node,

        children: [],
      };

      sections.push(current);
    } else {
      current?.children.push(node);
    }
  });

  return sections;
}
