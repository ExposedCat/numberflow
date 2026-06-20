import type { CSSProperties } from "@stitches/react";
import { Handle, type Position, useNodeId, useReactFlow } from "@xyflow/react";
import type { FC } from "react";
import { StyledText } from "../ui/Typography";

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
	const { setEdges } = useReactFlow();
	const isCircle = label.length <= 1;

	const onContextMenu: React.MouseEventHandler = (event) => {
		event.preventDefault();
		if (!nodeId) return;
		setEdges((prev) =>
			prev.filter(
				(edge) => edge[type] !== nodeId || edge[`${type}Handle`] !== id,
			),
		);
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
				width: isCircle ? "1.05rem" : "auto",
				height: "1.05rem",
				minWidth: "1.05rem",
				minHeight: "1.05rem",
				background: "black",
				backgroundClip: "padding-box",
				boxShadow: "none",
				color: "white",
				border: "none",
				borderRadius: "999px",
				cursor: "crosshair",
				outline: "none",
				padding: isCircle ? 0 : "0 0.14rem",
				transform: "none",
				...style,
			}}
			onContextMenu={onContextMenu}
		>
			<StyledText
				color="inverse"
				css={{
					alignItems: "center",
					background: "transparent",
					border: "none",
					display: "inline-flex",
					fontSize: "0.72rem",
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
	const { setEdges } = useReactFlow();

	const onContextMenu: React.MouseEventHandler = (event) => {
		event.preventDefault();
		if (!nodeId) return;
		setEdges((prev) =>
			prev.filter(
				(edge) => edge[type] !== nodeId || edge[`${type}Handle`] !== id,
			),
		);
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
				width: "6px",
				height: "6px",
				minWidth: "6px",
				minHeight: "6px",
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
