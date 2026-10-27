import { ViewportPortal, type XYPosition } from "@xyflow/react";
import {
	createContext,
	type MouseEvent,
	type PointerEvent,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	clipOrientation,
	clipPositionAt,
	type ResolvedClip,
	resolveClips,
	segmentIntersection,
	type WireClip,
	type WireGeometry,
} from "@/utils/clips";

const ClipContext = createContext<{
	clips: ResolvedClip[];
	register: (wire: WireGeometry) => void;
	unregister: (id: string) => void;
}>({ clips: [], register: () => {}, unregister: () => {} });

export const useWireClips = () => useContext(ClipContext);

type Gesture =
	| { kind: "draw"; points: XYPosition[] }
	| { kind: "drag"; clip: ResolvedClip; start: XYPosition; moved: boolean };

export function WireClips({
	clips,
	edgeIds,
	onChange,
	toFlowPosition,
	onClipClick,
	children,
}: {
	clips: WireClip[];
	edgeIds: string[];
	onChange: (clips: WireClip[]) => void;
	toFlowPosition: (point: XYPosition) => XYPosition;
	onClipClick: (event: MouseEvent, id: string) => void;
	children: ReactNode;
}) {
	const [geometries, setGeometries] = useState(new Map<string, WireGeometry>());
	const [stroke, setStroke] = useState<XYPosition[]>([]);
	const gesture = useRef<Gesture | null>(null);
	const suppressClick = useRef(false);
	const register = useCallback((wire: WireGeometry) => {
		setGeometries((previous) => new Map(previous).set(wire.id, wire));
	}, []);
	const unregister = useCallback((id: string) => {
		setGeometries((previous) => {
			const next = new Map(previous);
			next.delete(id);
			return next;
		});
	}, []);
	const resolved = useMemo(() => {
		const active = new Map(
			[...geometries].filter(([id]) => edgeIds.includes(id)),
		);
		return resolveClips(clips, active);
	}, [clips, edgeIds, geometries]);
	const context = useMemo(
		() => ({ clips: resolved, register, unregister }),
		[resolved, register, unregister],
	);

	const eventPoint = (event: PointerEvent) =>
		toFlowPosition({ x: event.clientX, y: event.clientY });
	const attachedWires = (clip: WireClip) =>
		clip.edgeIds.flatMap((id) => {
			const wire = geometries.get(id);
			return wire ? [wire] : [];
		});
	const updateDrag = (
		current: Extract<Gesture, { kind: "drag" }>,
		point: XYPosition,
	) => {
		const delta = {
			x: point.x - current.start.x,
			y: point.y - current.start.y,
		};
		if (Math.hypot(delta.x, delta.y) > 2) current.moved = true;
		if (!current.moved) return;
		const wires = attachedWires(current.clip);
		if (!wires.length) return;
		const position = clipPositionAt(
			{
				x: current.clip.center.x + delta.x,
				y: current.clip.center.y + delta.y,
			},
			wires,
		);
		onChange(
			clips.map((clip) =>
				clip.id === current.clip.id ? { ...clip, position } : clip,
			),
		);
	};
	const finishDrawing = (points: XYPosition[], container: HTMLDivElement) => {
		const hits: { wire: WireGeometry; point: XYPosition }[] = [];
		// Sample the rendered curves, including existing clip routes, in flow coordinates.
		for (const path of container.querySelectorAll<SVGPathElement>(
			"path[data-wire-id]",
		)) {
			const wire = geometries.get(path.dataset.wireId ?? "");
			if (!wire) continue;
			const length = path.getTotalLength();
			let previous = path.getPointAtLength(0);
			let hit: XYPosition | null = null;
			for (let distance = 5; distance < length + 5 && !hit; distance += 5) {
				const next = path.getPointAtLength(Math.min(length, distance));
				for (let index = 1; index < points.length && !hit; index++) {
					hit = segmentIntersection(
						points[index - 1],
						points[index],
						previous,
						next,
					);
				}
				previous = next;
			}
			if (hit) hits.push({ wire, point: hit });
		}
		if (!hits.length) return;
		const orientation = clipOrientation(hits);
		const axis = orientation === "vertical" ? "y" : "x";
		hits.sort((a, b) => a.point[axis] - b.point[axis]);
		const center = {
			x: hits.reduce((sum, hit) => sum + hit.point.x, 0) / hits.length,
			y: hits.reduce((sum, hit) => sum + hit.point.y, 0) / hits.length,
		};
		onChange([
			...clips,
			{
				id: crypto.randomUUID(),
				edgeIds: hits.map(({ wire }) => wire.id),
				position: clipPositionAt(
					center,
					hits.map(({ wire }) => wire),
				),
			},
		]);
	};

	return (
		<ClipContext.Provider value={context}>
			<div
				style={{ width: "100%", height: "100%" }}
				onPointerDownCapture={(event) => {
					suppressClick.current = false;
					if (event.button !== 0 || !(event.target instanceof Element)) return;
					if (
						event.target.closest(
							".react-flow__panel, input, textarea, button, [role='dialog']",
						)
					)
						return;
					const clipId = event.target
						.closest("[data-clipid]")
						?.getAttribute("data-clipid");
					const clip = resolved.find((clip) => clip.id === clipId);
					if (!event.ctrlKey && !clip) return;
					event.preventDefault();
					event.stopPropagation();
					event.currentTarget.setPointerCapture(event.pointerId);
					suppressClick.current = true;
					const point = eventPoint(event);
					gesture.current = event.ctrlKey
						? { kind: "draw", points: [point] }
						: {
								kind: "drag",
								clip: clip as ResolvedClip,
								start: point,
								moved: false,
							};
					if (event.ctrlKey) setStroke([point]);
				}}
				onPointerMoveCapture={(event) => {
					const current = gesture.current;
					if (!current) return;
					event.stopPropagation();
					const point = eventPoint(event);
					if (current.kind === "draw") {
						current.points.push(point);
						setStroke([...current.points]);
					} else updateDrag(current, point);
				}}
				onPointerUpCapture={(event) => {
					const current = gesture.current;
					if (!current) return;
					event.preventDefault();
					event.stopPropagation();
					gesture.current = null;
					if (current.kind === "draw")
						finishDrawing(
							[...current.points, eventPoint(event)],
							event.currentTarget,
						);
					else {
						updateDrag(current, eventPoint(event));
						if (!current.moved) onClipClick(event, current.clip.id);
					}
					setStroke([]);
					event.currentTarget.releasePointerCapture(event.pointerId);
				}}
				onLostPointerCapture={() => {
					gesture.current = null;
					setStroke([]);
				}}
				onPointerCancel={() => {
					gesture.current = null;
					setStroke([]);
				}}
				onClickCapture={(event) => {
					if (suppressClick.current) {
						event.stopPropagation();
						event.preventDefault();
						suppressClick.current = false;
					}
				}}
			>
				<StrokeContext.Provider value={stroke}>
					{children}
				</StrokeContext.Provider>
			</div>
		</ClipContext.Provider>
	);
}

const StrokeContext = createContext<XYPosition[]>([]);

export function ClipOverlay() {
	const { clips } = useWireClips();
	const stroke = useContext(StrokeContext);
	return (
		<ViewportPortal>
			<svg
				style={{
					position: "absolute",
					overflow: "visible",
					width: 1,
					height: 1,
					pointerEvents: "none",
					zIndex: 4,
				}}
			>
				<title>Wire clips</title>
				{clips.map((clip) => (
					<g
						key={clip.id}
						data-clipid={clip.id}
						style={{ pointerEvents: "auto", cursor: "grab" }}
					>
						<title>Drag clip to move · Click to remove</title>
						<line
							x1={clip.start.x}
							y1={clip.start.y}
							x2={clip.end.x}
							y2={clip.end.y}
							stroke="transparent"
							strokeWidth={20}
						/>
						<line
							x1={clip.start.x}
							y1={clip.start.y}
							x2={clip.end.x}
							y2={clip.end.y}
							stroke="var(--colors-canvas)"
							strokeWidth={8}
							strokeLinecap="round"
						/>
						<line
							x1={clip.start.x}
							y1={clip.start.y}
							x2={clip.end.x}
							y2={clip.end.y}
							stroke="var(--colors-node-handle)"
							strokeWidth={4}
							strokeLinecap="round"
						/>
						{[...clip.points].map(([id, point]) => (
							<circle
								key={id}
								cx={point.x}
								cy={point.y}
								r={2}
								fill="var(--colors-surface)"
							/>
						))}
					</g>
				))}
				{stroke.length > 1 && (
					<polyline
						points={stroke.map((point) => `${point.x},${point.y}`).join(" ")}
						fill="none"
						stroke="var(--colors-node-handle)"
						strokeWidth={2}
						strokeDasharray="6 4"
					/>
				)}
			</svg>
		</ViewportPortal>
	);
}
