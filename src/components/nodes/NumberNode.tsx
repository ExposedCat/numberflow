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
import type { ChangeEvent, FC, KeyboardEvent, PointerEvent } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { styled } from "@/theme";
import { compute, evaluate } from "@/utils/math";
import { updateOne } from "@/utils/state";
import type { WeightedEdgeType } from "../edges/WeightedEdge";
import { Box } from "../ui/Box";
import { PopupContent } from "../ui/Popup";
import { StyledText } from "../ui/Typography";
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
	boxSizing: "border-box",
	display: "block",
	fieldSizing: "content",
	fontSize: "$normal",
	lineHeight: "1.4",
	maxHeight: "8rem",
	minWidth: 0,
	minHeight: "2.25rem",
	overflow: "auto",
	resize: "none",
	width: "100%",
	border: "none",
	borderRadius: "$inner",
	paddingBlock: "$xs",
	paddingInline: "$sm",
	"&:focus": {
		outline: "none",
	},
});

const StyledField = styled("button", {
	alignItems: "center",
	background: "transparent",
	border: "none",
	color: "inherit",
	cursor: "text",
	display: "flex",
	fontFamily: "inherit",
	fontSize: "$normal",
	height: "100%",
	justifyContent: "center",
	marginRight: 0,
	padding: 0,
	textAlign: "center",
	width: "100%",
});

const DotHandleRow = styled("div", {
	alignItems: "center",
	display: "flex",
	flex: "0 0 auto",
	height: "1.35rem",
	width: "6px",
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

const HandleSizerRail = styled("div", {
	display: "flex",
	gap: "$xs",
	alignItems: "center",
	height: "0.75rem",
	overflow: "visible",
	paddingInline: "$xs",
	visibility: "hidden",
	pointerEvents: "none",
});

const HandleLabelSizer = styled("span", {
	display: "inline-flex",
	background: "black",
	color: "white",
	border: "none",
	borderRadius: "0.5rem",
	padding: "1px 4px",
});

const DotHandleSizer = styled("span", {
	display: "inline-flex",
	width: "6px",
	height: "6px",
	minWidth: "6px",
	minHeight: "6px",
	border: "1px solid transparent",
	borderRadius: "50%",
});

const ExpressionPopup = styled(PopupContent, {
	position: "fixed",
	width: "min(28rem, calc(100vw - 2rem))",
	minWidth: "14rem",
	transform: "translateX(-50%)",
});

const isCompactInputName = (name: string) =>
	name === "input" || name.length <= 5;

type SourceHandlePosition = Position.Bottom | Position.Right;
type TargetHandlePosition = Position.Left | Position.Top;

const SWITCH_DISTANCE_MARGIN = 5;

const sourceHandlePositions = [
	Position.Bottom,
	Position.Right,
] as const satisfies readonly SourceHandlePosition[];
const compactTargetHandlePositions = [
	Position.Top,
	Position.Left,
] as const satisfies readonly TargetHandlePosition[];

const getNodeRect = (node: NumberNodeType) => {
	const width = node.measured?.width ?? node.width ?? 0;
	const height = node.measured?.height ?? node.height ?? 0;

	return {
		x: node.position.x,
		y: node.position.y,
		width,
		height,
	};
};

const getHandlePoint = (
	node: NumberNodeType,
	position: SourceHandlePosition | TargetHandlePosition,
) => {
	const { x, y, width, height } = getNodeRect(node);

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
) => {
	const source = getHandlePoint(sourceNode, sourcePosition);
	const target = getHandlePoint(targetNode, targetPosition);
	return Math.hypot(target.x - source.x, target.y - source.y);
};

const getTargetHandlePositions = (
	targetHandle: string | null | undefined,
): readonly TargetHandlePosition[] =>
	targetHandle && isCompactInputName(targetHandle)
		? compactTargetHandlePositions
		: ([Position.Left] as TargetHandlePosition[]);

const getBestTargetPosition = (
	sourceNode: NumberNodeType,
	sourcePosition: SourceHandlePosition,
	targetNode: NumberNodeType,
	targetHandle: string | null | undefined,
	preferredPosition?: TargetHandlePosition,
) => {
	const candidates = getTargetHandlePositions(targetHandle);
	const initial =
		preferredPosition && candidates.includes(preferredPosition)
			? preferredPosition
			: candidates[0];

	return candidates.reduce((best, candidate) => {
		const bestDistance = getDistance(
			sourceNode,
			sourcePosition,
			targetNode,
			best,
		);
		const candidateDistance = getDistance(
			sourceNode,
			sourcePosition,
			targetNode,
			candidate,
		);
		return candidateDistance + SWITCH_DISTANCE_MARGIN < bestDistance
			? candidate
			: best;
	}, initial);
};

const getBestSourcePosition = (
	sourceNode: NumberNodeType,
	allEdges: WeightedEdgeType[],
	allNodes: NumberNodeType[],
	preferredPosition?: SourceHandlePosition,
) => {
	const outgoingEdges = allEdges.filter(
		(edge) => edge.source === sourceNode.id,
	);
	if (outgoingEdges.length === 0) {
		return Position.Right;
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

			return (
				total +
				getDistance(sourceNode, sourcePosition, targetNode, targetPosition)
			);
		}, 0);

	const initial =
		preferredPosition && sourceHandlePositions.includes(preferredPosition)
			? preferredPosition
			: sourceHandlePositions[0];

	return sourceHandlePositions.reduce((best, candidate) => {
		return getTotalDistance(candidate) + SWITCH_DISTANCE_MARGIN <
			getTotalDistance(best)
			? candidate
			: best;
	}, initial);
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
	const { setNodes, setEdges } = useReactFlow();
	const updateNodeInternals = useUpdateNodeInternals();

	const outHandleId = useId();

	const nodeId = useNodeId();
	const allEdges = useEdges<WeightedEdgeType>();
	const allNodes = useNodes<NumberNodeType>();

	const [isEditing, setIsEditing] = useState(false);
	const [editSessionInputs, setEditSessionInputs] = useState<string[] | null>(
		null,
	);
	const inputRef = useRef<HTMLTextAreaElement | null>(null);
	const fieldRef = useRef<HTMLButtonElement | null>(null);
	const previousInputPositionsRef = useRef<
		Record<string, TargetHandlePosition>
	>({});
	const previousSourcePositionRef = useRef<SourceHandlePosition>(
		Position.Right,
	);
	const pointerStartRef = useRef<{
		x: number;
		y: number;
		moved: boolean;
	} | null>(null);
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
	const currentNode = useMemo(
		() => allNodes.find((node) => node.id === nodeId),
		[allNodes, nodeId],
	);
	const inputPositions = useMemo(() => {
		const positions: Record<string, Position.Left | Position.Top> = {};
		if (!currentNode || !nodeId) {
			return positions;
		}

		for (const inputName of visibleInputs) {
			if (!isCompactInputName(inputName)) {
				positions[inputName] = Position.Left;
				continue;
			}

			const edge = allEdges.find(
				(edge) => edge.target === nodeId && edge.targetHandle === inputName,
			);
			const sourceNode = allNodes.find((node) => node.id === edge?.source);
			if (!sourceNode) {
				positions[inputName] = Position.Left;
				continue;
			}

			const sourcePosition = getBestSourcePosition(
				sourceNode,
				allEdges,
				allNodes,
			);
			positions[inputName] = getBestTargetPosition(
				sourceNode,
				sourcePosition,
				currentNode,
				inputName,
				previousInputPositionsRef.current[inputName],
			);
		}

		return positions;
	}, [allEdges, allNodes, currentNode, nodeId, visibleInputs]);
	const topInputs = visibleInputs.filter(
		(name) => inputPositions[name] === Position.Top,
	);
	const leftInputs = visibleInputs.filter(
		(name) => inputPositions[name] !== Position.Top,
	);
	const sourcePosition = useMemo(() => {
		if (!currentNode || !nodeId) {
			return Position.Right;
		}

		return getBestSourcePosition(
			currentNode,
			allEdges,
			allNodes,
			previousSourcePositionRef.current,
		);
	}, [allEdges, allNodes, currentNode, nodeId]);
	const handlePositionKey = [
		...visibleInputs.map((name) => `${name}:${inputPositions[name]}`),
		`out:${sourcePosition}`,
	].join("\u0000");

	useEffect(() => {
		previousInputPositionsRef.current = inputPositions;
		previousSourcePositionRef.current = sourcePosition;
	}, [inputPositions, sourcePosition]);

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
		setEdges((prev) =>
			prev.filter((edge) => {
				if (edge.target !== nodeId) return true;
				if (!edge.targetHandle) return false;
				return validHandles.has(edge.targetHandle);
			}),
		);
		setEditSessionInputs(null);
	}, [inputs, isEditing, nodeId, setEdges]);

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

	const openEditor = (target: HTMLElement) => {
		const rect = target.getBoundingClientRect();
		setPopupPosition({
			top: rect.bottom + 8,
			left: rect.left + rect.width / 2,
		});
		setEditSessionInputs(inputs);
		setIsEditing(true);
	};

	useEffect(() => {
		if (!isEditing) return;
		inputRef.current?.focus();
		inputRef.current?.select();
		if (inputRef.current) {
			resizeTextarea(inputRef.current);
		}
	}, [isEditing]);

	const handleFieldPointerDown = ({
		clientX,
		clientY,
	}: PointerEvent<HTMLButtonElement>) => {
		pointerStartRef.current = { x: clientX, y: clientY, moved: false };
	};

	const handleFieldPointerMove = ({
		clientX,
		clientY,
	}: PointerEvent<HTMLButtonElement>) => {
		const start = pointerStartRef.current;
		if (!start) return;

		const distance = Math.hypot(clientX - start.x, clientY - start.y);
		if (distance > 4) {
			start.moved = true;
		}
	};

	const handleFieldPointerUp = ({
		clientX,
		clientY,
	}: PointerEvent<HTMLButtonElement>) => {
		const start = pointerStartRef.current;
		pointerStartRef.current = null;
		if (!start) return;

		const distance = Math.hypot(clientX - start.x, clientY - start.y);
		if (!start.moved && distance <= 4) {
			if (fieldRef.current) {
				openEditor(fieldRef.current);
			}
		}
	};

	const handleInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
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
			column
			center
			css={{
				background: "$white",
				position: "relative",
				border: "solid $border-default",
				borderWidth: "$thin",
				borderRadius: "$basic",
			}}
		>
			{topInputs.length > 0 && (
				<>
					<HandleSizerRail aria-hidden="true">
						{topInputs.map((name) =>
							name === "input" ? (
								<DotHandleSizer key={name} />
							) : (
								<HandleLabelSizer key={name}>
									<StyledText color="inverse">{name}</StyledText>
								</HandleLabelSizer>
							),
						)}
					</HandleSizerRail>
					<TopHandleRail>
						{topInputs.map((name) =>
							name === "input" ? (
								<DotHandle
									key={name}
									type="target"
									id={name}
									position={Position.Top}
								/>
							) : (
								<LocalHandle
									key={name}
									type="target"
									id={name}
									label={name}
									position={Position.Top}
								/>
							),
						)}
					</TopHandleRail>
				</>
			)}

			{name && (
				<Box
					center
					css={{
						width: "100%",
						borderBottom: "solid $border-default",
						borderWidth: "$thin",
					}}
				>
					<StyledText>{name}</StyledText>
				</Box>
			)}

			<Box
				css={{
					width: "100%",
					height: "100%",
					paddingBlock: "$xs",
					alignItems: "stretch",
				}}
			>
				<Box
					column
					css={{
						gap: "$xs",
						alignItems: "flex-start",
						flex: "0 0 auto",
						marginLeft: leftInputs.length > 0 ? "-$sm" : "0",
					}}
				>
					{leftInputs.map((name) =>
						name === "input" ? (
							<DotHandleRow
								key={name}
								css={{
									marginLeft:
										leftInputs.length > 0 ? "calc($sm - 3px)" : "-3px",
								}}
							>
								<DotHandle type="target" id={name} position={Position.Left} />
							</DotHandleRow>
						) : (
							<LocalHandle
								key={name}
								type="target"
								id={name}
								label={name}
								position={Position.Left}
							/>
						),
					)}
				</Box>

				<Box
					css={{
						flex: 1,
						minWidth: 0,
						position: "relative",
						paddingInline: "$sm",
					}}
				>
					<StyledField
						ref={fieldRef}
						type="button"
						tabIndex={0}
						aria-label="Edit expression"
						onPointerDown={handleFieldPointerDown}
						onPointerMove={handleFieldPointerMove}
						onPointerUp={handleFieldPointerUp}
						onPointerCancel={() => {
							pointerStartRef.current = null;
						}}
						onKeyDown={(event) => {
							if (event.key === "Enter" || event.key === " ") {
								event.preventDefault();
								openEditor(event.currentTarget);
							}
						}}
					>
						<StyledText>{computedValue ?? "NULL"}</StyledText>
					</StyledField>

					{isEditing &&
						popupPosition &&
						createPortal(
							<ExpressionPopup
								className="nodrag nowheel nopan"
								css={{
									top: popupPosition.top,
									left: popupPosition.left,
								}}
								onClick={(event) => event.stopPropagation()}
								onPointerDown={(event) => event.stopPropagation()}
							>
								<StyledTextarea
									ref={inputRef}
									value={expression ?? ""}
									onChange={handleChange}
									onBlur={() => setIsEditing(false)}
									onKeyDown={handleInputKeyDown}
								/>
							</ExpressionPopup>,
							document.body,
						)}
				</Box>
			</Box>

			<Handle
				type="source"
				id={outHandleId}
				position={sourcePosition}
				style={{ zIndex: 2 }}
			/>
		</Box>
	);
};
