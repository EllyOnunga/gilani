import Paragraph from "@/components/blocks/Paragraph";
import Heading from "@/components/blocks/Heading";
import Divider from "@/components/blocks/Divider";
import Blockquote from "@/components/blocks/Blockquote";
import List from "@/components/blocks/List";

import { CodeBlock, DiffBlock, JsonViewer } from "@/components/code";
import { MathBlock, FormulaCard, InlineMath, MatrixRenderer, UnitRenderer, GraphRenderer, GeometryRenderer } from "@/components/maths";
import { ChemicalReaction, MolecularStructure, PeriodicTable } from "@/components/chemistry";
import { FreeBodyDiagram, CircuitDiagram, KinematicsEquation } from "@/components/physics";

import DefinitionCard from "@/components/cards/DefinitionCard";
import ExampleCard from "@/components/cards/ExampleCard";
import WarningCard from "@/components/cards/WarningCard";
import StudyTipCard from "@/components/cards/StudyTipCard";
import SummaryCard from "@/components/cards/SummaryCard";

export const registry = {
    paragraph: Paragraph,
    heading: Heading,
    divider: Divider,
    blockquote: Blockquote,
    list: List,
    
    code: CodeBlock,
    diff: DiffBlock,
    json: JsonViewer,
    
    math: MathBlock,
    formula: FormulaCard,
    inlineMath: InlineMath,
    
    reaction: ChemicalReaction,
    molecule: MolecularStructure,
    periodic: PeriodicTable,

    fbd: FreeBodyDiagram,
    circuit: CircuitDiagram,
    kinematics: KinematicsEquation,

    graph: GraphRenderer,
    geometry: GeometryRenderer,

    matrix: MatrixRenderer,
    unit: UnitRenderer,
    
    note: StudyTipCard,
    warning: WarningCard,
    success: SummaryCard,
    definition: DefinitionCard,
    example: ExampleCard,
};