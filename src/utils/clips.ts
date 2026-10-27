import { getBezierPath, Position, type XYPosition } from "@xyflow/react";

export type WireGeometry = {
	id: string;
	source: XYPosition;
	target: XYPosition;
	sourcePosition: Position;
	targetPosition: Position;
};

export type WireClip = {
	id: string;
	edgeIds: string[];
	// Ratios within the attached wires' endpoint bounds, never canvas pixels.
	position: XYPosition;
};

export type ResolvedClip = WireClip & {
	orientation: "horizontal" | "vertical";
	center: XYPosition;
	points: Map<string, XYPosition>;
	start: XYPosition;
	end: XYPosition;
};

const CLIP_SPACING = 16;
const CLIP_PADDING = 10;

export const getClipBounds = (wires: WireGeometry[]) => {
	const points = wires.flatMap((wire) => [wire.source, wire.target]);
	const x = Math.min(...points.map((point) => point.x));
	const y = Math.min(...points.map((point) => point.y));
	return {
		x,
		y,
		width: Math.max(1, Math.max(...points.map((point) => point.x)) - x),
		height: Math.max(1, Math.max(...points.map((point) => point.y)) - y),
	};
};

export const clipPositionAt = (point: XYPosition, wires: WireGeometry[]) => {
	const bounds = getClipBounds(wires);
	return {
		x: (point.x - bounds.x) / bounds.width,
		y: (point.y - bounds.y) / bounds.height,
	};
};

export const clipOrientation = (
	hits: { wire: WireGeometry; point: XYPosition }[],
): ResolvedClip["orientation"] => {
	const horizontalWires = hits.filter(({ wire, point }) => {
		const distance = (end: XYPosition) =>
			Math.hypot(end.x - point.x, end.y - point.y);
		const position =
			distance(wire.source) <= distance(wire.target)
				? wire.sourcePosition
				: wire.targetPosition;
		return position === Position.Left || position === Position.Right;
	}).length;
	return horizontalWires >= hits.length / 2 ? "vertical" : "horizontal";
};

export const resolveClips = (
	clips: WireClip[],
	geometries: Map<string, WireGeometry>,
): ResolvedClip[] =>
	clips.flatMap((clip) => {
		const wires = clip.edgeIds.flatMap((id) => {
			const wire = geometries.get(id);
			return wire ? [wire] : [];
		});
		if (!wires.length) return [];
		const bounds = getClipBounds(wires);
		const center = {
			x: bounds.x + clip.position.x * bounds.width,
			y: bounds.y + clip.position.y * bounds.height,
		};
		const orientation = clipOrientation(
			wires.map((wire) => ({ wire, point: center })),
		);
		const vertical = orientation === "vertical";
		const axis = vertical ? "y" : "x";
		// Keep the attachment order stable when nodes move past one another.
		const points = new Map(
			wires.map((wire, index) => [
				wire.id,
				{
					...center,
					[axis]:
						center[axis] + (index - (wires.length - 1) / 2) * CLIP_SPACING,
				},
			]),
		);
		const halfLength = ((wires.length - 1) * CLIP_SPACING) / 2 + CLIP_PADDING;
		return [
			{
				...clip,
				orientation,
				center,
				points,
				start: { ...center, [axis]: center[axis] - halfLength },
				end: { ...center, [axis]: center[axis] + halfLength },
			},
		];
	});

const direction = (position: Position): XYPosition => ({
	x: position === Position.Left ? -1 : position === Position.Right ? 1 : 0,
	y: position === Position.Top ? -1 : position === Position.Bottom ? 1 : 0,
});

export const clippedWirePath = (wire: WireGeometry, clips: ResolvedClip[]) => {
	const dx = wire.target.x - wire.source.x;
	const dy = wire.target.y - wire.source.y;
	const lengthSquared = dx * dx + dy * dy || 1;
	const attachments = clips
		.flatMap((clip) => {
			const point = clip.points.get(wire.id);
			if (!point) return [];
			const progress =
				((point.x - wire.source.x) * dx + (point.y - wire.source.y) * dy) /
				lengthSquared;
			const tangent =
				clip.orientation === "vertical"
					? { x: dx < 0 ? -1 : 1, y: 0 }
					: { x: 0, y: dy < 0 ? -1 : 1 };
			return [{ point, tangent, progress }];
		})
		.sort((a, b) => a.progress - b.progress);
	if (!attachments.length) {
		return getBezierPath({
			sourceX: wire.source.x,
			sourceY: wire.source.y,
			targetX: wire.target.x,
			targetY: wire.target.y,
			sourcePosition: wire.sourcePosition,
			targetPosition: wire.targetPosition,
		})[0];
	}
	const targetDirection = direction(wire.targetPosition);
	const anchors = [
		{ point: wire.source, tangent: direction(wire.sourcePosition) },
		...attachments,
		{
			point: wire.target,
			tangent: { x: -targetDirection.x, y: -targetDirection.y },
		},
	];
	let path = `M ${wire.source.x},${wire.source.y}`;
	for (let index = 1; index < anchors.length; index++) {
		const previous = anchors[index - 1];
		const next = anchors[index];
		const reach =
			Math.hypot(
				next.point.x - previous.point.x,
				next.point.y - previous.point.y,
			) * 0.4;
		path += ` C ${previous.point.x + previous.tangent.x * reach},${previous.point.y + previous.tangent.y * reach} ${next.point.x - next.tangent.x * reach},${next.point.y - next.tangent.y * reach} ${next.point.x},${next.point.y}`;
	}
	return path;
};

export const segmentIntersection = (
	a: XYPosition,
	b: XYPosition,
	c: XYPosition,
	d: XYPosition,
): XYPosition | null => {
	const rx = b.x - a.x;
	const ry = b.y - a.y;
	const sx = d.x - c.x;
	const sy = d.y - c.y;
	const denominator = rx * sy - ry * sx;
	if (Math.abs(denominator) < 1e-8) return null;
	const t = ((c.x - a.x) * sy - (c.y - a.y) * sx) / denominator;
	const u = ((c.x - a.x) * ry - (c.y - a.y) * rx) / denominator;
	return t >= 0 && t <= 1 && u >= 0 && u <= 1
		? { x: a.x + t * rx, y: a.y + t * ry }
		: null;
};

export const isWireClip = (value: unknown): value is WireClip => {
	if (typeof value !== "object" || value === null) return false;
	const clip = value as WireClip;
	return (
		typeof clip.id === "string" &&
		Array.isArray(clip.edgeIds) &&
		clip.edgeIds.length > 0 &&
		clip.edgeIds.every((id) => typeof id === "string") &&
		typeof clip.position === "object" &&
		clip.position !== null &&
		[clip.position.x, clip.position.y].every(Number.isFinite)
	);
};
