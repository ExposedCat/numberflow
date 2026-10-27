import {
	type ConnectionLineComponentProps,
	type Edge,
	type EdgeProps,
	getBezierPath,
} from "@xyflow/react";
import type { FC } from "react";

export type WeightedEdgeType = Edge<Record<string, never>, "weighted">;

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
			<path d={path} fill="none" className="react-flow__edge-path" />
			<path
				d={path}
				fill="none"
				strokeOpacity={0}
				strokeWidth={20}
				className="react-flow__edge-interaction"
			/>
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
		? { x: toHandle.x, y: toHandle.y }
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
