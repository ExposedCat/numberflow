import { type FC, useMemo } from "react";
import { theme } from "@/theme";
import { type FormulaToken, tokenizeFormula } from "@/utils/math";

const VARIABLE_COLORS = [
	theme.colors["syntax-variable-1"].toString(),
	theme.colors["syntax-variable-2"].toString(),
	theme.colors["syntax-variable-3"].toString(),
	theme.colors["syntax-variable-4"].toString(),
	theme.colors["syntax-variable-5"].toString(),
];

const INVERSE_COLORS = [
	theme.colors["syntax-inverse-1"].toString(),
	theme.colors["syntax-inverse-2"].toString(),
	theme.colors["syntax-inverse-3"].toString(),
	theme.colors["syntax-inverse-4"].toString(),
	theme.colors["syntax-inverse-5"].toString(),
];

const getTokenColor = (
	{ text, type }: FormulaToken,
	variableColors: Map<string, string>,
	palette: string[],
) => {
	switch (type) {
		case "variable":
			return variableColors.get(text) ?? palette[0];
		case "function":
			return palette[2];
		case "constant":
			return palette[4];
		case "number":
			return palette[1];
		case "operator":
			return palette[0];
		case "punctuation":
			return "inherit";
		case "string":
			return palette[3];
		case "unknown":
			return palette[0];
		default:
			return "inherit";
	}
};

type FormulaTokensProps = {
	expression: string;
	inverse?: boolean;
};

export const FormulaTokens: FC<FormulaTokensProps> = ({
	expression,
	inverse = false,
}) => {
	const tokens = useMemo(() => tokenizeFormula(expression), [expression]);
	const palette = inverse ? INVERSE_COLORS : VARIABLE_COLORS;
	const variableColors = useMemo(() => {
		const colors = new Map<string, string>();
		for (const token of tokens) {
			if (token.type !== "variable" || colors.has(token.text)) {
				continue;
			}
			colors.set(token.text, palette[colors.size % palette.length]);
		}
		return colors;
	}, [tokens, palette]);

	return (
		<>
			{tokens.map((token, index) => (
				<span
					// biome-ignore lint/suspicious/noArrayIndexKey: Tokens are stateless text fragments in expression order.
					key={`${index}-${token.text}`}
					style={{
						color: getTokenColor(token, variableColors, palette),
					}}
				>
					{token.text}
				</span>
			))}
		</>
	);
};
