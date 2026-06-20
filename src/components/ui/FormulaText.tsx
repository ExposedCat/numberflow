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

const getTokenColor = (
	{ text, type }: FormulaToken,
	variableColors: Map<string, string>,
) => {
	switch (type) {
		case "variable":
			return variableColors.get(text) ?? VARIABLE_COLORS[0];
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
	const variableColors = useMemo(() => {
		const colors = new Map<string, string>();
		for (const token of tokens) {
			if (token.type !== "variable" || colors.has(token.text)) {
				continue;
			}
			colors.set(
				token.text,
				VARIABLE_COLORS[colors.size % VARIABLE_COLORS.length],
			);
		}
		return colors;
	}, [tokens]);

	return (
		<>
			{tokens.map((token, index) => (
				<span
					key={`${index}-${token.text}`}
					style={{ color: getTokenColor(token, variableColors) }}
				>
					{token.text}
				</span>
			))}
		</>
	);
};
