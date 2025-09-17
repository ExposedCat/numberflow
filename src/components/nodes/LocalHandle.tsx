import type { CSSProperties } from "@stitches/react";
import { Handle, type Position, useNodeId, useReactFlow } from "@xyflow/react";
import type { FC } from "react";
import { Box } from "../ui/Box";
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
				all: "unset",
				...style,
			}}
			onContextMenu={onContextMenu}
		>
			<Box
				css={{
					background: "black",
					color: "white",
					borderRadius: "$basic",
					padding: "1px 4px",
				}}
			>
				<StyledText color="inverse">{label}</StyledText>
			</Box>
		</Handle>
	);
};
