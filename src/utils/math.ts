import { type MathNode, parse, type SymbolNode } from "mathjs";

export type FormulaTokenType =
	| "whitespace"
	| "variable"
	| "function"
	| "constant"
	| "number"
	| "operator"
	| "punctuation"
	| "string"
	| "unknown";

export type FormulaToken = {
	text: string;
	type: FormulaTokenType;
};

const BUILT_IN_CONSTANTS = new Set([
	"e",
	"i",
	"E",
	"Infinity",
	"LN10",
	"LN2",
	"LOG10E",
	"LOG2E",
	"NaN",
	"PI",
	"null",
	"phi",
	"pi",
	"SQRT1_2",
	"SQRT2",
	"tau",
	"true",
	"false",
	"undefined",
]);

const WORD_OPERATORS = new Set(["and", "in", "mod", "not", "or", "to", "xor"]);
const OPERATOR_CHARACTERS = new Set([
	"+",
	"-",
	"*",
	"/",
	"^",
	"%",
	"=",
	"<",
	">",
	"!",
	"&",
	"|",
	"~",
	"?",
	":",
]);
const PUNCTUATION_CHARACTERS = new Set([
	"(",
	")",
	"[",
	"]",
	"{",
	"}",
	",",
	";",
]);

const isIdentifierStart = (character: string) => /[A-Za-z_$]/.test(character);

const isIdentifierPart = (character: string) => /[A-Za-z0-9_$]/.test(character);

const isFunctionName = (
	_node: MathNode,
	path: string,
	parent: MathNode | null,
) => parent?.type === "FunctionNode" && path === "fn";

const isBuiltInConstant = (name: string) => BUILT_IN_CONSTANTS.has(name);

const nextNonWhitespaceCharacter = (input: string, index: number) => {
	let cursor = index;
	while (cursor < input.length && /\s/.test(input[cursor])) {
		cursor += 1;
	}
	return input[cursor];
};

const readWhile = (
	input: string,
	start: number,
	accepts: (character: string) => boolean,
) => {
	let cursor = start;
	while (cursor < input.length && accepts(input[cursor])) {
		cursor += 1;
	}
	return cursor;
};

export function evaluate(input: string) {
	const expression = parse(input);
	const inputs = new Set(
		expression
			.filter(
				(node, path, parent) =>
					node.type === "SymbolNode" &&
					!isFunctionName(node, path, parent) &&
					!isBuiltInConstant((node as SymbolNode).name),
			)
			.map((node) => (node as SymbolNode).name),
	);
	return [...inputs];
}

export function compute(input: string, variables: Record<string, number>) {
	const expression = parse(input);
	const result = expression.evaluate(variables);
	return Number(result);
}

export function tokenizeFormula(input: string): FormulaToken[] {
	const tokens: FormulaToken[] = [];
	let cursor = 0;

	while (cursor < input.length) {
		const character = input[cursor];

		if (/\s/.test(character)) {
			const end = readWhile(input, cursor, (value) => /\s/.test(value));
			tokens.push({ text: input.slice(cursor, end), type: "whitespace" });
			cursor = end;
			continue;
		}

		if (character === '"' || character === "'") {
			const quote = character;
			let end = cursor + 1;
			while (end < input.length) {
				if (input[end] === "\\" && end + 1 < input.length) {
					end += 2;
					continue;
				}
				if (input[end] === quote) {
					end += 1;
					break;
				}
				end += 1;
			}
			tokens.push({ text: input.slice(cursor, end), type: "string" });
			cursor = end;
			continue;
		}

		if (
			/\d/.test(character) ||
			(character === "." && /\d/.test(input[cursor + 1]))
		) {
			let end = cursor;
			if (input[end] === ".") {
				end += 1;
			}
			end = readWhile(input, end, (value) => /\d/.test(value));
			if (input[end] === ".") {
				end += 1;
				end = readWhile(input, end, (value) => /\d/.test(value));
			}
			if (input[end]?.toLowerCase() === "e") {
				const exponentStart = end;
				end += 1;
				if (input[end] === "+" || input[end] === "-") {
					end += 1;
				}
				const exponentEnd = readWhile(input, end, (value) => /\d/.test(value));
				end = exponentEnd > end ? exponentEnd : exponentStart;
			}
			tokens.push({ text: input.slice(cursor, end), type: "number" });
			cursor = end;
			continue;
		}

		if (isIdentifierStart(character)) {
			const end = readWhile(input, cursor, isIdentifierPart);
			const text = input.slice(cursor, end);
			const type = WORD_OPERATORS.has(text)
				? "operator"
				: isBuiltInConstant(text)
					? "constant"
					: nextNonWhitespaceCharacter(input, end) === "("
						? "function"
						: "variable";
			tokens.push({ text, type });
			cursor = end;
			continue;
		}

		if (OPERATOR_CHARACTERS.has(character)) {
			const end = readWhile(input, cursor, (value) =>
				OPERATOR_CHARACTERS.has(value),
			);
			tokens.push({ text: input.slice(cursor, end), type: "operator" });
			cursor = end;
			continue;
		}

		if (PUNCTUATION_CHARACTERS.has(character)) {
			tokens.push({ text: character, type: "punctuation" });
			cursor += 1;
			continue;
		}

		tokens.push({ text: character, type: "unknown" });
		cursor += 1;
	}

	return tokens;
}
