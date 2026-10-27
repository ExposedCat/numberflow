import {
	Handle,
	type Node,
	type NodeProps,
	Position,
	useEdges,
	useNodeId,
	useNodes,
	useReactFlow,
	useUpdateNodeInternals,
} from "@xyflow/react";
import { Trash2, X } from "lucide-react";
import type { ChangeEvent, FC, KeyboardEvent, PointerEvent } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { styled, theme } from "@/theme";
import { GRID_CELL_SIZE } from "@/utils/layout";
import { compute, evaluate } from "@/utils/math";
import { updateOne } from "@/utils/state";
import type { WeightedEdgeType } from "../edges/WeightedEdge";
import { Box } from "../ui/Box";
import { fieldSurfaceStyles, IconButton } from "../ui/Controls";
import { FormulaTokens } from "../ui/FormulaText";
import { PopupContent } from "../ui/Popup";
import { DotHandle, LocalHandle } from "./LocalHandle";

export type NumberNodeType = Node<
	{
		name?: string;
		expression: string;
		inputs: string[];
		computedValue: number | null;
	},
	"number"
>;

const StyledTextarea = styled("textarea", {
	background: "transparent",
	border: "none",
	borderRadius: "$inner",
	boxSizing: "border-box",
	caretColor: "$text-primary",
	color: "transparent",
	display: "block",
	fieldSizing: "content",
	fontFamily: "$number",
	fontSize: "$normal",
	lineHeight: "1.75rem",
	maxHeight: "8rem",
	minHeight: "2.25rem",
	minWidth: 0,
	overflow: "auto",
	position: "relative",
	resize: "none",
	textAlign: "left",
	width: "100%",
	zIndex: 1,
	paddingBlock: "0.25rem",
	paddingInline: "$sm",
	"&::selection": {
		backgroundColor: "$selection",
		color: "$text-primary",
	},
	"&:focus": {
		outline: "none",
	},
});

const StyledField = styled("div", {
	alignItems: "center",
	background: "transparent",
	border: "none",
	color: "inherit",
	cursor: "inherit",
	display: "flex",
	fontFamily: "$number",
	fontSize: "$number",
	lineHeight: 1.4,
	fontVariantNumeric: "tabular-nums",
	height: "auto",
	justifyContent: "flex-start",
	marginRight: 0,
	padding: 0,
	textAlign: "left",
	width: "100%",
});

const StyledFormula = styled("span", {
	display: "block",
	fontSize: "$normal",
	fontWeight: "$medium",
	lineHeight: 1.4,
	maxWidth: "15rem",
	overflow: "hidden",
	textAlign: "left",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap",
	width: "max-content",
});

const DotHandleRow = styled("div", {
	alignItems: "center",
	display: "flex",
	flex: "0 0 auto",
	height: "1.35rem",
	width: "10px",
});

const TopHandleRail = styled("div", {
	position: "absolute",
	top: 0,
	left: "50%",
	zIndex: 3,
	display: "flex",
	gap: "$xs",
	alignItems: "center",
	transform: "translate(-50%, -50%)",
});

const ExpressionPopupFrame = styled("div", {
	position: "fixed",
	width: "min(360px, calc(100vw - 32px))",
	transform: "translateX(-50%)",
	zIndex: 20,
});

const ExpressionPopup = styled(PopupContent, {
	position: "relative",
	width: "100%",
	transform: "none",
});

const FormulaActionRow = styled("div", {
	display: "flex",
	alignItems: "center",
	gap: "$xs",
});

const FormulaEditorHeader = styled("div", {
	display: "flex",
	justifyContent: "space-between",
	alignItems: "center",
	marginBottom: "$sm",
});

const FormulaActionButton = styled(IconButton, {
	defaultVariants: { context: "editor" },
});

const FormulaEditorShell = styled("div", {
	...fieldSurfaceStyles,
	position: "relative",
	width: "100%",
});

const FormulaEditorHighlight = styled("div", {
	borderRadius: "$inner",
	color: "$text-primary",
	fontFamily: "$number",
	fontSize: "$normal",
	inset: 0,
	lineHeight: "1.75rem",
	maxHeight: "8rem",
	minHeight: "2.25rem",
	overflow: "hidden",
	paddingBlock: "0.25rem",
	paddingInline: "$sm",
	pointerEvents: "none",
	position: "absolute",
	textAlign: "left",
	whiteSpace: "pre-wrap",
	wordBreak: "break-word",
});

const FormulaEditorHighlightContent = styled("div", {
	minHeight: "1.75rem",
});

const isCompactInputName = (name: string) =>
	name === "input" || name.length <= 5;

type SourceHandlePosition = Position.Bottom | Position.Right;
type TargetHandlePosition = Position.Left | Position.Top;

const sourceHandlePositions = [
	Position.Bottom,
	Position.Right,
] as const satisfies readonly SourceHandlePosition[];
const compactTargetHandlePositions = [
	Position.Top,
	Position.Left,
] as const satisfies readonly TargetHandlePosition[];

const VIRTUAL_HANDLE_SPACE = 12;
const ROOT_FONT_SIZE = 16;
const SPACE_XS = ROOT_FONT_SIZE * 0.25;
const SPACE_SM = ROOT_FONT_SIZE * 0.5;
const BORDER_WIDTH = 1;
const TOP_LABEL_CLEARANCE_HEIGHT = ROOT_FONT_SIZE * 0.2;
const LEFT_LABEL_CLEARANCE_WIDTH = ROOT_FONT_SIZE * 0.2;
const LEFT_HANDLE_BORDER_OVERLAP = SPACE_SM;
const DOT_HANDLE_ROW_WIDTH = 10;
const DOT_HANDLE_LEFT_MARGIN = LEFT_HANDLE_BORDER_OVERLAP - 5;
const DOT_HANDLE_ROW_HEIGHT = ROOT_FONT_SIZE * 1.5;
const LOCAL_HANDLE_MIN_WIDTH = 28;
const LOCAL_HANDLE_HEIGHT = 28;
const LOCAL_HANDLE_INLINE_PADDING = ROOT_FONT_SIZE * 0.25 * 2;
const LOCAL_HANDLE_FONT_SIZE = 20;
const LOCAL_HANDLE_FONT_WEIGHT = 500;
const NORMAL_TEXT_FONT_SIZE = 20;
const NORMAL_TEXT_FONT_WEIGHT = 400;
const NORMAL_TEXT_LINE_HEIGHT = NORMAL_TEXT_FONT_SIZE * 1.4;
const FORMULA_TEXT_FONT_SIZE = 20;
const FORMULA_TEXT_FONT_WEIGHT = 500;
const FORMULA_TEXT_LINE_HEIGHT = FORMULA_TEXT_FONT_SIZE * 1.4;
const FORMULA_TEXT_MAX_WIDTH = ROOT_FONT_SIZE * 15;
const FORMULA_TEXT_WIDTH_BUFFER = ROOT_FONT_SIZE * 1.5;

let textMeasureContext: CanvasRenderingContext2D | null | undefined;

const TopLabelClearance = styled("div", {
	height: `${TOP_LABEL_CLEARANCE_HEIGHT}px`,
	pointerEvents: "none",
});

type NumberNodeKind = "input" | "processor" | "output";

const NODE_STYLE_BY_KIND = {
	input: {
		background: theme.colors.surface.toString(),
		text: theme.colors["text-primary"].toString(),
		handle: theme.colors["node-handle"].toString(),
		handleText: theme.colors.surface.toString(),
	},
	processor: {
		background: theme.colors["node-processor"].toString(),
		text: theme.colors["node-processor-text"].toString(),
		handle: theme.colors["node-processor-text"].toString(),
		handleText: theme.colors["node-processor"].toString(),
	},
	output: {
		background: theme.colors["node-output"].toString(),
		text: theme.colors["node-output-text"].toString(),
		handle: theme.colors["node-output-text"].toString(),
		handleText: theme.colors["node-output"].toString(),
	},
} satisfies Record<
	NumberNodeKind,
	{
		background: string;
		text: string;
		handle: string;
		handleText: string;
	}
>;

type NodeSize = {
	width: number;
	height: number;
};

const getNodeRect = (node: NumberNodeType, size = getNumberNodeSize(node)) => {
	const { width, height } = size;

	return {
		x: node.position.x - VIRTUAL_HANDLE_SPACE,
		y: node.position.y - VIRTUAL_HANDLE_SPACE,
		width: width + VIRTUAL_HANDLE_SPACE * 2,
		height: height + VIRTUAL_HANDLE_SPACE * 2,
	};
};

const getHandlePoint = (
	node: NumberNodeType,
	position: SourceHandlePosition | TargetHandlePosition,
	size?: NodeSize,
) => {
	const { x, y, width, height } = getNodeRect(node, size);

	switch (position) {
		case Position.Top:
			return { x: x + width / 2, y };
		case Position.Right:
			return { x: x + width, y: y + height / 2 };
		case Position.Bottom:
			return { x: x + width / 2, y: y + height };
		case Position.Left:
			return { x, y: y + height / 2 };
	}
};

const getDistance = (
	sourceNode: NumberNodeType,
	sourcePosition: SourceHandlePosition,
	targetNode: NumberNodeType,
	targetPosition: TargetHandlePosition,
	sourceSize?: NodeSize,
	targetSize?: NodeSize,
) => {
	const source = getHandlePoint(sourceNode, sourcePosition, sourceSize);
	const target = getHandlePoint(targetNode, targetPosition, targetSize);
	return Math.hypot(target.x - source.x, target.y - source.y);
};

const getTargetHandlePositions = (
	targetHandle: string | null | undefined,
): readonly TargetHandlePosition[] =>
	targetHandle && isCompactInputName(targetHandle)
		? compactTargetHandlePositions
		: ([Position.Left] as TargetHandlePosition[]);

const getCanvasTextWidth = (
	text: string,
	fontSize: number,
	fontWeight: number,
	monospace = false,
) => {
	if (typeof document !== "undefined") {
		if (textMeasureContext === undefined) {
			textMeasureContext = document.createElement("canvas").getContext("2d");
		}
		if (textMeasureContext) {
			const fontFamily = monospace
				? theme.fonts.number.value
				: window.getComputedStyle(document.body).fontFamily;
			textMeasureContext.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
			return textMeasureContext.measureText(text).width;
		}
	}

	return text.length * fontSize * 0.6;
};

const measureCompactHandleWidth = (name: string) => {
	if (name === "input") {
		return DOT_HANDLE_ROW_WIDTH + DOT_HANDLE_LEFT_MARGIN;
	}
	if (name.length <= 1) {
		return LOCAL_HANDLE_MIN_WIDTH;
	}
	return Math.max(
		LOCAL_HANDLE_MIN_WIDTH,
		getCanvasTextWidth(
			name.toUpperCase(),
			LOCAL_HANDLE_FONT_SIZE,
			LOCAL_HANDLE_FONT_WEIGHT,
		) + LOCAL_HANDLE_INLINE_PADDING,
	);
};

const getLeftColumnWidth = (leftInputs: string[]): number =>
	leftInputs.length > 0
		? Math.max(...leftInputs.map(measureCompactHandleWidth)) -
			LEFT_HANDLE_BORDER_OVERLAP
		: 0;

const getLeftColumnHeight = (leftInputs: string[]) =>
	leftInputs.reduce((height, inputName, index) => {
		const rowHeight =
			inputName === "input" ? DOT_HANDLE_ROW_HEIGHT : LOCAL_HANDLE_HEIGHT;
		return height + rowHeight + (index > 0 ? SPACE_XS : 0);
	}, 0);

const getValueText = (node: NumberNodeType) =>
	String(node.data.computedValue ?? 0);

const getFormulaText = (node: NumberNodeType) =>
	node.data.inputs.length > 0 ? node.data.expression.trim() : "";

const getCompleteInputPositions = (
	inputs: string[],
	positions: Partial<Record<string, TargetHandlePosition>>,
) =>
	Object.fromEntries(
		inputs.map((input) => [
			input,
			isCompactInputName(input)
				? (positions[input] ?? Position.Left)
				: Position.Left,
		]),
	) as Record<string, TargetHandlePosition>;

type CommittedNodeLayout = {
	incomingSourcePositions: Partial<Record<string, SourceHandlePosition>>;
	inputPositions: Record<string, TargetHandlePosition>;
	sourcePosition: SourceHandlePosition;
};

const committedNodeLayouts = new Map<string, CommittedNodeLayout>();

const getCommittedInputPositions = (node: NumberNodeType) =>
	getCompleteInputPositions(
		node.data.inputs,
		committedNodeLayouts.get(node.id)?.inputPositions ?? {},
	);

const getInputPositionsWithTarget = (
	node: NumberNodeType,
	targetHandle: string | null | undefined,
	targetPosition: TargetHandlePosition,
) => ({
	...getCommittedInputPositions(node),
	...(targetHandle ? { [targetHandle]: targetPosition } : {}),
});

const getNumberNodeSize = (
	node: NumberNodeType,
	inputs = node.data.inputs,
	positions = getCompleteInputPositions(inputs, {}),
): NodeSize => {
	const completePositions = getCompleteInputPositions(inputs, positions);
	const leftInputs = inputs.filter(
		(name) => completePositions[name] !== Position.Top,
	);
	const topInputs = inputs.filter(
		(name) => completePositions[name] === Position.Top,
	);
	const hasTopLabel = topInputs.some((name) => name !== "input");
	const hasVisibleLeftLabel = leftInputs.some((name) => name !== "input");
	const topClearanceHeight =
		hasTopLabel && !hasVisibleLeftLabel ? TOP_LABEL_CLEARANCE_HEIGHT : 0;
	const leftClearanceWidth = hasVisibleLeftLabel
		? LEFT_LABEL_CLEARANCE_WIDTH + 12
		: 20;
	const leftColumnWidth = getLeftColumnWidth(leftInputs);
	const leftColumnHeight = getLeftColumnHeight(leftInputs);
	const valueWidth = getCanvasTextWidth(
		getValueText(node),
		NORMAL_TEXT_FONT_SIZE,
		NORMAL_TEXT_FONT_WEIGHT,
		true,
	);
	const formulaText = getFormulaText(node);
	const formulaWidth = formulaText
		? Math.min(
				getCanvasTextWidth(
					formulaText,
					FORMULA_TEXT_FONT_SIZE,
					FORMULA_TEXT_FONT_WEIGHT,
					true,
				) + FORMULA_TEXT_WIDTH_BUFFER,
				FORMULA_TEXT_MAX_WIDTH,
			)
		: 0;
	const formulaHeight = formulaText ? FORMULA_TEXT_LINE_HEIGHT + SPACE_XS : 0;
	const nameWidth = node.data.name
		? getCanvasTextWidth(node.data.name, 20, NORMAL_TEXT_FONT_WEIGHT)
		: 0;
	const nameHeight = node.data.name ? 20 * 1.4 + 16 : 0;
	const bodyWidth =
		leftColumnWidth +
		Math.max(valueWidth, formulaWidth) +
		leftClearanceWidth +
		20;
	const bodyHeight =
		Math.max(leftColumnHeight, NORMAL_TEXT_LINE_HEIGHT + formulaHeight) + 32;
	const width = Math.ceil(Math.max(bodyWidth, nameWidth) + BORDER_WIDTH * 2);
	const height = Math.ceil(
		topClearanceHeight + nameHeight + bodyHeight + BORDER_WIDTH * 2,
	);
	const clampedHeight = Math.max(height, GRID_CELL_SIZE);

	return {
		width: Math.max(width, inputs.length > 0 ? 180 : 144),
		height: clampedHeight,
	};
};

const pickShorterPosition = <
	T extends SourceHandlePosition | TargetHandlePosition,
>(
	candidates: readonly T[],
	getScore: (position: T) => number,
	previous: T | undefined,
) => {
	const initial =
		previous && candidates.includes(previous) ? previous : candidates[0];

	return candidates.reduce(
		(best, candidate) =>
			getScore(candidate) < getScore(best) ? candidate : best,
		initial,
	);
};

const getBestTargetPosition = (
	sourceNode: NumberNodeType,
	sourcePosition: SourceHandlePosition,
	targetNode: NumberNodeType,
	targetHandle: string | null | undefined,
	previousPosition?: TargetHandlePosition,
	getTargetSize?: (position: TargetHandlePosition) => NodeSize,
) => {
	const candidates = getTargetHandlePositions(targetHandle);

	return pickShorterPosition(
		candidates,
		(candidate) => {
			const targetSize =
				getTargetSize?.(candidate) ??
				getNumberNodeSize(
					targetNode,
					targetNode.data.inputs,
					getInputPositionsWithTarget(targetNode, targetHandle, candidate),
				);
			return getDistance(
				sourceNode,
				sourcePosition,
				targetNode,
				candidate,
				undefined,
				targetSize,
			);
		},
		previousPosition,
	);
};

const getBestSourcePosition = (
	sourceNode: NumberNodeType,
	allEdges: WeightedEdgeType[],
	allNodes: NumberNodeType[],
	previousPosition?: SourceHandlePosition,
	sourceSize = getNumberNodeSize(
		sourceNode,
		sourceNode.data.inputs,
		getCommittedInputPositions(sourceNode),
	),
) => {
	const outgoingEdges = allEdges.filter(
		(edge) => edge.source === sourceNode.id,
	);
	if (outgoingEdges.length === 0) {
		return previousPosition ?? Position.Right;
	}

	const getTotalDistance = (sourcePosition: SourceHandlePosition) =>
		outgoingEdges.reduce((total, edge) => {
			const targetNode = allNodes.find((node) => node.id === edge.target);
			if (!targetNode) return total;

			const targetPosition = getBestTargetPosition(
				sourceNode,
				sourcePosition,
				targetNode,
				edge.targetHandle,
			);
			const targetSize = getNumberNodeSize(
				targetNode,
				targetNode.data.inputs,
				getInputPositionsWithTarget(
					targetNode,
					edge.targetHandle,
					targetPosition,
				),
			);

			return (
				total +
				getDistance(
					sourceNode,
					sourcePosition,
					targetNode,
					targetPosition,
					sourceSize,
					targetSize,
				)
			);
		}, 0);

	return pickShorterPosition(
		sourceHandlePositions,
		getTotalDistance,
		previousPosition,
	);
};

const resizeTextarea = (textarea: HTMLTextAreaElement) => {
	const { maxHeight } = window.getComputedStyle(textarea);
	const maxHeightValue = Number.parseFloat(maxHeight);

	textarea.style.height = "auto";
	textarea.style.height = `${Math.min(
		textarea.scrollHeight,
		Number.isFinite(maxHeightValue) ? maxHeightValue : textarea.scrollHeight,
	)}px`;
};

export const NumberNode: FC<NodeProps<NumberNodeType>> = ({
	data: { name, expression, inputs, computedValue },
}) => {
	const { getEdges, getNodes, setEdges, setNodes } = useReactFlow<
		NumberNodeType,
		WeightedEdgeType
	>();
	const updateNodeInternals = useUpdateNodeInternals();

	const nodeId = useNodeId();
	const allEdges = useEdges<WeightedEdgeType>();
	const allNodes = useNodes<NumberNodeType>();

	const [isEditing, setIsEditing] = useState(false);
	const [isMovingNode, setIsMovingNode] = useState(false);
	const [editSessionInputs, setEditSessionInputs] = useState<string[] | null>(
		null,
	);
	const [editorScroll, setEditorScroll] = useState({ left: 0, top: 0 });
	const inputRef = useRef<HTMLTextAreaElement | null>(null);
	const nodeRef = useRef<HTMLDivElement | null>(null);
	const pointerStartRef = useRef<{
		x: number;
		y: number;
		moved: boolean;
	} | null>(null);
	const committedInputPositionsRef = useRef<
		Partial<Record<string, TargetHandlePosition>>
	>({});
	const committedIncomingSourcePositionsRef = useRef<
		Partial<Record<string, SourceHandlePosition>>
	>({});
	const committedSourcePositionRef = useRef<SourceHandlePosition>(
		Position.Right,
	);
	const [popupPosition, setPopupPosition] = useState<{
		top: number;
		left: number;
	} | null>(null);

	const visibleInputs = useMemo(() => {
		const sortInputFirst = (names: string[]) => {
			if (!names.includes("input")) {
				return names;
			}
			return ["input", ...names.filter((name) => name !== "input")];
		};

		if (!editSessionInputs) {
			return sortInputFirst(inputs);
		}
		const nextInputs = new Set([...editSessionInputs, ...inputs]);
		return sortInputFirst([...nextInputs]);
	}, [editSessionInputs, inputs]);
	const visibleInputKey = visibleInputs.join("\u0000");
	const compactInputs = visibleInputs.filter(isCompactInputName);
	const hasOutgoingEdges = allEdges.some((edge) => edge.source === nodeId);
	const nodeKind: NumberNodeKind =
		inputs.length === 0 ? "input" : hasOutgoingEdges ? "processor" : "output";
	const nodeStyle = NODE_STYLE_BY_KIND[nodeKind];
	const formulaText = inputs.length > 0 ? expression.trim() : "";
	const handleStyle = {
		background: nodeStyle.handle,
		border: `1px solid ${nodeStyle.background}`,
		color: nodeStyle.handleText,
	};
	const currentNode = useMemo(
		() => allNodes.find((node) => node.id === nodeId),
		[allNodes, nodeId],
	);
	const inputLayout = useMemo(() => {
		const previousInputPositions = getCompleteInputPositions(
			visibleInputs,
			committedInputPositionsRef.current,
		);
		const positions = { ...previousInputPositions };
		const incomingSourcePositions: Partial<
			Record<string, SourceHandlePosition>
		> = {};
		if (!currentNode || !nodeId) {
			return { incomingSourcePositions, positions };
		}

		for (const inputName of visibleInputs) {
			if (!isCompactInputName(inputName)) {
				positions[inputName] = Position.Left;
				continue;
			}

			const edge = allEdges.find(
				(edge) => edge.target === nodeId && edge.targetHandle === inputName,
			);
			if (!edge) {
				positions[inputName] = Position.Left;
				continue;
			}

			const sourceNode = allNodes.find((node) => node.id === edge.source);
			if (!sourceNode) {
				positions[inputName] = Position.Left;
				continue;
			}

			const sourcePosition = getBestSourcePosition(
				sourceNode,
				allEdges,
				allNodes,
				committedIncomingSourcePositionsRef.current[edge.id],
			);
			incomingSourcePositions[edge.id] = sourcePosition;
			positions[inputName] = getBestTargetPosition(
				sourceNode,
				sourcePosition,
				currentNode,
				inputName,
				positions[inputName],
				(candidatePosition) =>
					getNumberNodeSize(currentNode, visibleInputs, {
						...positions,
						[inputName]: candidatePosition,
					}),
			);
		}

		return { incomingSourcePositions, positions };
	}, [allEdges, allNodes, currentNode, nodeId, visibleInputs]);
	const inputPositions = inputLayout.positions;
	const renderedNode = useMemo(
		() =>
			currentNode ??
			({
				id: nodeId ?? "",
				position: { x: 0, y: 0 },
				data: { name, expression, inputs, computedValue },
			} as NumberNodeType),
		[currentNode, nodeId, name, expression, inputs, computedValue],
	);
	const nodeSize = useMemo(
		() => getNumberNodeSize(renderedNode, visibleInputs, inputPositions),
		[renderedNode, inputPositions, visibleInputs],
	);
	const topInputs = visibleInputs.filter(
		(name) => inputPositions[name] === Position.Top,
	);
	const leftInputs = visibleInputs.filter(
		(name) => inputPositions[name] !== Position.Top,
	);
	const hasLeftColumnSpace = leftInputs.length > 0;
	const hasTopLabel = topInputs.some((name) => name !== "input");
	const hasVisibleLeftLabel = leftInputs.some((name) => name !== "input");
	const leftContentPadding = hasVisibleLeftLabel
		? `${LEFT_LABEL_CLEARANCE_WIDTH + 12}px`
		: "20px";
	const needsTopLabelClearance = hasTopLabel && !hasVisibleLeftLabel;
	const sourcePosition = useMemo(() => {
		if (!currentNode || !nodeId) {
			return Position.Right;
		}

		return getBestSourcePosition(
			currentNode,
			allEdges,
			allNodes,
			committedSourcePositionRef.current,
			nodeSize,
		);
	}, [allEdges, allNodes, currentNode, nodeId, nodeSize]);
	useLayoutEffect(() => {
		if (!nodeId) return;

		committedNodeLayouts.set(nodeId, {
			incomingSourcePositions: inputLayout.incomingSourcePositions,
			inputPositions,
			sourcePosition,
		});
		committedInputPositionsRef.current = inputPositions;
		committedIncomingSourcePositionsRef.current =
			inputLayout.incomingSourcePositions;
		committedSourcePositionRef.current = sourcePosition;
		return () => {
			committedNodeLayouts.delete(nodeId);
		};
	}, [
		inputLayout.incomingSourcePositions,
		inputPositions,
		nodeId,
		sourcePosition,
	]);
	const handlePositionKey = [
		...visibleInputs.map((name) => `${name}:${inputPositions[name]}`),
		`out:${sourcePosition}`,
		`size:${nodeSize.width}x${nodeSize.height}`,
	].join("\u0000");

	const nextValue = useMemo(() => {
		if (!nodeId) return null as number | null;
		const variables: Record<string, number> = {};
		for (const variable of inputs) {
			const edge = allEdges.find(
				(e) =>
					e.target === nodeId &&
					e.type === "weighted" &&
					e.targetHandle === variable,
			);
			if (!edge) return null;
			const srcNode = allNodes.find((node) => node.id === edge.source);
			const value =
				typeof srcNode?.data.computedValue === "number"
					? srcNode.data.computedValue
					: null;
			if (value === null) return null;
			variables[variable] = value;
		}
		try {
			const computed = compute(expression, variables);
			return Number.isFinite(computed) ? computed : null;
		} catch {
			return null;
		}
	}, [allEdges, allNodes, inputs, nodeId, expression]);

	useEffect(() => {
		if (!nodeId) return;

		const next = nextValue;
		if (next !== computedValue) {
			setNodes(
				updateOne("id", nodeId, (node) => ({
					...node,
					data: { ...node.data, computedValue: next },
				})),
			);
		}
	}, [computedValue, nodeId, setNodes, nextValue]);

	useEffect(() => {
		if (!nodeId) return;

		void visibleInputKey;
		void handlePositionKey;
		updateNodeInternals(nodeId);
	}, [handlePositionKey, nodeId, updateNodeInternals, visibleInputKey]);

	useEffect(() => {
		if (!nodeId || isEditing) return;

		const validHandles = new Set(inputs);
		const currentEdges = getEdges();
		const nextEdges = currentEdges.filter((edge) => {
			if (edge.target !== nodeId) return true;
			if (!edge.targetHandle) return false;
			return validHandles.has(edge.targetHandle);
		});

		if (nextEdges.length !== currentEdges.length) {
			setEdges(nextEdges);
		}
		if (editSessionInputs) {
			setEditSessionInputs(null);
		}
	}, [editSessionInputs, getEdges, inputs, isEditing, nodeId, setEdges]);

	const handleChange = ({
		currentTarget,
	}: ChangeEvent<HTMLTextAreaElement>) => {
		const { value: current } = currentTarget;
		if (!nodeId) return;
		let nextInputs: string[] = [];
		try {
			nextInputs = current ? evaluate(current) : [];
		} catch {
			nextInputs = [];
		}
		setNodes(
			updateOne("id", nodeId, (node) => ({
				...node,
				data: { ...node.data, expression: current, inputs: nextInputs },
			})),
		);
		resizeTextarea(currentTarget);
	};

	const removeCurrentNode = () => {
		if (!nodeId) return;

		const nextNodes = getNodes().filter((node) => node.id !== nodeId);
		const nextEdges = getEdges().filter(
			(edge) => edge.source !== nodeId && edge.target !== nodeId,
		);
		setNodes(nextNodes);
		setEdges(nextEdges);
		setIsEditing(false);
	};

	const openEditor = (target: HTMLElement) => {
		const rect = target.getBoundingClientRect();
		setPopupPosition({
			top: Math.max(16, Math.min(rect.bottom + 12, window.innerHeight - 240)),
			left: Math.max(
				Math.min(360, window.innerWidth - 32) / 2 + 16,
				Math.min(
					rect.left + rect.width / 2,
					window.innerWidth - Math.min(360, window.innerWidth - 32) / 2 - 16,
				),
			),
		});
		setEditSessionInputs(inputs);
		setIsEditing(true);
	};

	useEffect(() => {
		if (!isEditing) return;
		setEditorScroll({ left: 0, top: 0 });
		inputRef.current?.focus();
		inputRef.current?.select();
		if (inputRef.current) {
			resizeTextarea(inputRef.current);
		}
	}, [isEditing]);

	const isNodePointerTarget = (target: EventTarget | null) =>
		!(target instanceof Element && target.closest(".react-flow__handle"));

	const handleFieldPointerDown = ({
		clientX,
		clientY,
		target,
	}: PointerEvent<HTMLDivElement>) => {
		if (!isNodePointerTarget(target)) {
			pointerStartRef.current = null;
			setIsMovingNode(false);
			return;
		}

		setIsMovingNode(false);
		pointerStartRef.current = { x: clientX, y: clientY, moved: false };
	};

	const handleFieldPointerMove = ({
		clientX,
		clientY,
	}: PointerEvent<HTMLDivElement>) => {
		const start = pointerStartRef.current;
		if (!start) return;

		const distance = Math.hypot(clientX - start.x, clientY - start.y);
		if (distance > 4) {
			start.moved = true;
			setIsMovingNode(true);
		}
	};

	const handleFieldPointerUp = ({
		clientX,
		clientY,
		target,
	}: PointerEvent<HTMLDivElement>) => {
		if (!isNodePointerTarget(target)) {
			pointerStartRef.current = null;
			setIsMovingNode(false);
			return;
		}

		const start = pointerStartRef.current;
		pointerStartRef.current = null;
		if (!start) {
			setIsMovingNode(false);
			return;
		}

		const distance = Math.hypot(clientX - start.x, clientY - start.y);
		if (!start.moved && distance <= 4) {
			if (nodeRef.current) {
				openEditor(nodeRef.current);
			}
		}
		setIsMovingNode(false);
	};

	const handleInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
		event.stopPropagation();
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			setIsEditing(false);
		}
		if (event.key === "Escape") {
			event.preventDefault();
			setIsEditing(false);
		}
	};

	return (
		<Box
			ref={nodeRef}
			column
			center
			role="button"
			tabIndex={0}
			aria-label="Edit expression"
			data-node-kind={nodeKind}
			onPointerDown={handleFieldPointerDown}
			onPointerMove={handleFieldPointerMove}
			onPointerUp={handleFieldPointerUp}
			onPointerCancel={() => {
				pointerStartRef.current = null;
				setIsMovingNode(false);
			}}
			onKeyDown={(event) => {
				if (event.defaultPrevented || event.target !== event.currentTarget) {
					return;
				}
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					openEditor(event.currentTarget);
				}
			}}
			css={{
				background: nodeStyle.background,
				color: nodeStyle.text,
				position: "relative",
				width: `${nodeSize.width}px`,
				height: `${nodeSize.height}px`,
				border: "1px solid transparent",
				borderRadius: "$basic",
				boxShadow: isEditing
					? `0 0 0 2px ${theme.colors["border-focus"]}`
					: "$node",
				cursor: isMovingNode ? "grabbing" : "grab",

				"&:focus-visible": {
					outline: "2px solid $border-focus",
					outlineOffset: "3px",
				},
			}}
		>
			{compactInputs.length > 0 && (
				<TopHandleRail>
					{topInputs.map((name) =>
						name === "input" ? (
							<DotHandle
								key={name}
								type="target"
								id={name}
								position={Position.Top}
								style={handleStyle}
							/>
						) : (
							<LocalHandle
								key={name}
								type="target"
								id={name}
								label={name.toUpperCase()}
								position={Position.Top}
								style={handleStyle}
							/>
						),
					)}
				</TopHandleRail>
			)}
			{needsTopLabelClearance && <TopLabelClearance aria-hidden="true" />}

			{name && (
				<Box
					center
					css={{
						width: "100%",
						justifyContent: "flex-start",
						paddingInline: "20px",
						paddingTop: "16px",
						fontSize: "$normal",
					}}
				>
					<span>{name}</span>
				</Box>
			)}

			<Box
				css={{
					width: "100%",
					height: "auto",
					paddingBlock: "16px",
					alignItems: "stretch",
				}}
			>
				<Box
					column
					css={{
						gap: "$xs",
						alignItems: "flex-start",
						flex: "0 0 auto",
						marginLeft: hasLeftColumnSpace
							? `-${LEFT_HANDLE_BORDER_OVERLAP}px`
							: "0",
					}}
				>
					{leftInputs.map((name) =>
						name === "input" ? (
							<DotHandleRow
								key={name}
								css={{
									marginLeft: hasLeftColumnSpace
										? `${DOT_HANDLE_LEFT_MARGIN}px`
										: "-5px",
								}}
							>
								<DotHandle
									type="target"
									id={name}
									position={Position.Left}
									style={handleStyle}
								/>
							</DotHandleRow>
						) : (
							<LocalHandle
								key={name}
								type="target"
								id={name}
								label={name.toUpperCase()}
								position={Position.Left}
								style={handleStyle}
							/>
						),
					)}
				</Box>

				<Box
					column
					center
					css={{
						flex: 1,
						gap: "$xs",
						minWidth: 0,
						position: "relative",
						paddingLeft: leftContentPadding,
						paddingRight: "20px",
						alignItems: "flex-start",
					}}
				>
					<StyledField data-node-field>
						<span>{computedValue ?? 0}</span>
					</StyledField>
					{formulaText && (
						<StyledFormula title={formulaText}>
							<FormulaTokens
								expression={formulaText}
								inverse={nodeKind === "output"}
							/>
						</StyledFormula>
					)}

					{isEditing &&
						popupPosition &&
						createPortal(
							<ExpressionPopupFrame
								className="nodrag nowheel nopan"
								role="dialog"
								aria-label="Expression editor"
								onBlur={(event) => {
									if (!event.currentTarget.contains(event.relatedTarget))
										setIsEditing(false);
								}}
								css={{
									top: popupPosition.top,
									left: popupPosition.left,
								}}
								onClick={(event) => event.stopPropagation()}
								onPointerDown={(event) => event.stopPropagation()}
							>
								<ExpressionPopup>
									<FormulaEditorHeader>
										<span>Expression</span>
										<FormulaActionRow>
											<FormulaActionButton
												appearance="danger"
												aria-label="Remove node"
												onClick={removeCurrentNode}
												onPointerDown={(event) => {
													event.preventDefault();
												}}
												title="Remove node"
												type="button"
											>
												<Trash2 aria-hidden size={18} strokeWidth={2} />
											</FormulaActionButton>
											<FormulaActionButton
												type="button"
												aria-label="Close editor"
												onClick={() => setIsEditing(false)}
											>
												<X aria-hidden size={16} />
											</FormulaActionButton>
										</FormulaActionRow>
									</FormulaEditorHeader>
									<FormulaEditorShell>
										<FormulaEditorHighlight aria-hidden="true">
											<FormulaEditorHighlightContent
												style={{
													transform: `translate(${-editorScroll.left}px, ${-editorScroll.top}px)`,
												}}
											>
												<FormulaTokens expression={expression ?? ""} />
											</FormulaEditorHighlightContent>
										</FormulaEditorHighlight>
										<StyledTextarea
											ref={inputRef}
											aria-label="Expression"
											value={expression ?? ""}
											onChange={handleChange}
											onKeyDown={handleInputKeyDown}
											onScroll={(event) => {
												setEditorScroll({
													left: event.currentTarget.scrollLeft,
													top: event.currentTarget.scrollTop,
												});
											}}
											spellCheck={false}
										/>
									</FormulaEditorShell>
								</ExpressionPopup>
							</ExpressionPopupFrame>,
							document.body,
						)}
				</Box>
			</Box>

			<Handle
				type="source"
				id="output"
				position={sourcePosition}
				style={{ zIndex: 2, width: 10, height: 10, ...handleStyle }}
			/>
		</Box>
	);
};
