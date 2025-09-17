import {
	BaseEdge,
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
			<BaseEdge path={path} />
		</g>
	);
};
