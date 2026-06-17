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

export const LocalHandle: FC<NodeHandleProps> = ({
	type,
	id,
	position,
	style,
	label,
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
				display: "inline-flex",
				width: "auto",
				height: "auto",
				minWidth: 0,
				minHeight: 0,
				background: "black",
				color: "white",
				border: "none",
				borderRadius: "0.5rem",
				padding: "1px 4px",
				transform: "none",
				...style,
			}}
			onContextMenu={onContextMenu}
		>
			<StyledText color="inverse" css={{ pointerEvents: "none" }}>
				{label}
			</StyledText>
		</Handle>
	);
};
