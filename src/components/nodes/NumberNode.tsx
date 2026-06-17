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
import { LocalHandle } from "./LocalHandle";

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
	marginRight: "$sm",
	padding: 0,
	textAlign: "center",
	width: "calc(100% - 0.5rem)",
});

const ExpressionPopup = styled(PopupContent, {
	position: "fixed",
	width: "min(28rem, calc(100vw - 2rem))",
	minWidth: "14rem",
	transform: "translateX(-50%)",
});

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
	const inputRef = useRef<HTMLTextAreaElement | null>(null);
	const fieldRef = useRef<HTMLButtonElement | null>(null);
	const pointerStartRef = useRef<{
		x: number;
		y: number;
		moved: boolean;
	} | null>(null);
	const [popupPosition, setPopupPosition] = useState<{
		top: number;
		left: number;
	} | null>(null);

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

		updateNodeInternals(nodeId);

		const validHandles = new Set(inputs);
		setEdges((prev) =>
			prev.filter((edge) => {
				if (edge.target !== nodeId) return true;
				if (!edge.targetHandle) return false;
				return validHandles.has(edge.targetHandle);
			}),
		);
	}, [inputs, nodeId, setEdges, updateNodeInternals]);

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
				border: "solid $border-default",
				borderWidth: "$thin",
				borderRadius: "$basic",
			}}
		>
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
						marginLeft: inputs.length > 0 ? "-$sm" : "0",
					}}
				>
					{inputs.map((name) => (
						<LocalHandle
							key={name}
							type="target"
							id={name}
							label={name}
							position={Position.Left}
						/>
					))}
				</Box>

				<Box
					css={{ width: "100%", position: "relative", paddingInline: "$xs" }}
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

					<Handle
						type="source"
						id={outHandleId}
						position={Position.Right}
						style={{ zIndex: 2 }}
					/>
				</Box>
			</Box>
		</Box>
	);
};
