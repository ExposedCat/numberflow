import { Handle, type Position, useNodeId, useReactFlow } from "@xyflow/react";
import type { CSSProperties, FC } from "react";
import type { WeightedEdgeType } from "../edges/WeightedEdge";
import { StyledText } from "../ui/Typography";
import type { NumberNodeType } from "./NumberNode";

export type NodeHandleProps = {
	id: string;
	label: string;
	type: "target" | "source";
	position: Position;
	style?: CSSProperties;
};

export type DotHandleProps = Omit<NodeHandleProps, "label">;

export const LocalHandle: FC<NodeHandleProps> = ({
	type,
	id,
	position,
	style,
	label,
}) => {
	const nodeId = useNodeId();
	const { getEdges, setEdges } = useReactFlow<
		NumberNodeType,
		WeightedEdgeType
	>();
	const isCircle = label.length <= 1;

	const onContextMenu: React.MouseEventHandler = (event) => {
		event.preventDefault();
		if (!nodeId) return;
		const nextEdges = getEdges().filter(
			(edge) => edge[type] !== nodeId || edge[`${type}Handle`] !== id,
		);
		setEdges(nextEdges);
	};

	return (
		<Handle
			type={type}
			id={id}
			position={position}
			style={{
				position: "relative",
				top: "auto",
				left: "auto",
				right: "auto",
				bottom: "auto",
				boxSizing: "border-box",
				display: "inline-flex",
				alignItems: "center",
				justifyContent: "center",
				width: isCircle ? "1.75rem" : "auto",
				height: "1.75rem",
				minWidth: "1.75rem",
				minHeight: "1.75rem",
				background: "var(--colors-node-handle)",
				backgroundClip: "padding-box",
				boxShadow: "none",
				color: "var(--colors-surface)",
				border: "none",
				borderRadius: "999px",
				cursor: "crosshair",
				outline: "none",
				padding: isCircle ? 0 : "0 0.25rem",
				transform: "none",
				...style,
			}}
			onContextMenu={onContextMenu}
		>
			<StyledText
				css={{
					alignItems: "center",
					background: "transparent",
					border: "none",
					display: "inline-flex",
					fontSize: "$normal",
					fontWeight: "$semibold",
					height: "100%",
					justifyContent: "center",
					lineHeight: 1,
					pointerEvents: "none",
				}}
			>
				{label}
			</StyledText>
		</Handle>
	);
};

export const DotHandle: FC<DotHandleProps> = ({
	type,
	id,
	position,
	style,
}) => {
	const nodeId = useNodeId();
	const { getEdges, setEdges } = useReactFlow<
		NumberNodeType,
		WeightedEdgeType
	>();

	const onContextMenu: React.MouseEventHandler = (event) => {
		event.preventDefault();
		if (!nodeId) return;
		const nextEdges = getEdges().filter(
			(edge) => edge[type] !== nodeId || edge[`${type}Handle`] !== id,
		);
		setEdges(nextEdges);
	};

	return (
		<Handle
			type={type}
			id={id}
			position={position}
			style={{
				position: "relative",
				top: "auto",
				left: "auto",
				right: "auto",
				bottom: "auto",
				boxSizing: "border-box",
				display: "inline-flex",
				width: "10px",
				height: "10px",
				minWidth: "10px",
				minHeight: "10px",
				background:
					"var(--xy-handle-background-color, var(--xy-handle-background-color-default))",
				backgroundClip: "padding-box",
				border:
					"1px solid var(--xy-handle-border-color, var(--xy-handle-border-color-default))",
				borderRadius: "50%",
				boxShadow: "none",
				cursor: "crosshair",
				outline: "none",
				padding: 0,
				transform: "none",
				...style,
			}}
			onContextMenu={onContextMenu}
		/>
	);
};
