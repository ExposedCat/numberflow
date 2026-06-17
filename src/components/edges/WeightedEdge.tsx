import type { Handle } from "@xyflow/react";
import {
	BaseEdge,
	type ConnectionLineComponentProps,
	type Edge,
	type EdgeProps,
	getBezierPath,
	Position,
} from "@xyflow/react";
import type { FC } from "react";

export type WeightedEdgeType = Edge<Record<string, never>, "weighted">;

const getConnectionHandleAnchor = (handle: Handle) => {
	switch (handle.position) {
		case Position.Left:
			return { x: handle.x - handle.width / 2, y: handle.y };
		case Position.Right:
			return { x: handle.x + handle.width / 2, y: handle.y };
		case Position.Top:
			return { x: handle.x, y: handle.y - handle.height / 2 };
		case Position.Bottom:
			return { x: handle.x, y: handle.y + handle.height / 2 };
	}
};

export const WeightedEdge: FC<EdgeProps<WeightedEdgeType>> = ({
	id,
	sourceX,
	sourceY,
	targetX,
	targetY,
	sourcePosition,
	targetPosition,
}) => {
	const [path] = getBezierPath({
		sourceX,
		sourceY,
		targetX,
		targetY,
		sourcePosition,
		targetPosition,
	});

	return (
		<g data-edgeid={id}>
			<BaseEdge path={path} />
		</g>
	);
};

export const WeightedConnectionLine: FC<ConnectionLineComponentProps> = ({
	connectionLineStyle,
	fromX,
	fromY,
	fromPosition,
	toHandle,
	toX,
	toY,
	toPosition,
}) => {
	const source = { x: fromX, y: fromY };
	const target = toHandle
		? getConnectionHandleAnchor(toHandle)
		: { x: toX, y: toY };

	const [path] = getBezierPath({
		sourceX: source.x,
		sourceY: source.y,
		targetX: target.x,
		targetY: target.y,
		sourcePosition: fromPosition,
		targetPosition: toPosition,
	});

	return (
		<path
			d={path}
			fill="none"
			className="react-flow__connection-path"
			style={connectionLineStyle}
		/>
	);
};
