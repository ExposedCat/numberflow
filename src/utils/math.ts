import { parse, type SymbolNode } from "mathjs";

export function evaluate(input: string) {
	const expression = parse(input);
	const inputs = new Set(
		expression
			.filter((node) => node.type === "SymbolNode")
			.map((node) => (node as SymbolNode).name),
	);
	return [...inputs];
}

export function compute(input: string, variables: Record<string, number>) {
	const expression = parse(input);
	const result = expression.evaluate(variables);
	return Number(result);
}
