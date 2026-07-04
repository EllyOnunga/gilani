import { Sigma } from "lucide-react";

interface Props {

    title?: string;

}

export default function EquationToolbar({

    title

}: Props) {

    return (

        <div

            className="
flex
items-center
justify-between
border-b
border-zinc-800
bg-zinc-900
px-4
py-3
"

        >

            <div className="flex items-center gap-2">

                <Sigma size={18} />

                <span>

                    {title ?? "Equation"}

                </span>

            </div>

        </div>

    );

}