import { type FC, useMemo } from "react";
import { type FormulaToken, tokenizeFormula } from "@/utils/math";

const VARIABLE_COLORS = [
	"#c91d6f",
	"#0072b2",
	"#16a34a",
	"#b78d00",
	"#8b5cf6",
	"#dc2626",
	"#0f766e",
	"#be185d",
];

const hashText = (text: string) => {
	let hash = 0;
	for (const character of text) {
		hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
	}
	return hash;
};

const getVariableColor = (name: string) =>
	VARIABLE_COLORS[hashText(name) % VARIABLE_COLORS.length];

const getTokenColor = ({ text, type }: FormulaToken) => {
	switch (type) {
		case "variable":
			return getVariableColor(text);
		case "function":
			return "#0072b2";
		case "constant":
			return "#8b5cf6";
		case "number":
			return "#0f766e";
		case "operator":
			return "#dc2626";
		case "punctuation":
			return "#6b7280";
		case "string":
			return "#b78d00";
		case "unknown":
			return "#dc2626";
		default:
			return "inherit";
	}
};

type FormulaTokensProps = {
	expression: string;
};

export const FormulaTokens: FC<FormulaTokensProps> = ({ expression }) => {
	const tokens = useMemo(() => tokenizeFormula(expression), [expression]);

	return (
		<>
			{tokens.map((token, index) => (
				<span
					key={`${index}-${token.text}`}
					style={{ color: getTokenColor(token) }}
				>
					{token.text}
				</span>
			))}
		</>
	);
};
