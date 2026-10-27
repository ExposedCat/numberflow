import type { Viewport } from "@xyflow/react";
import type { WeightedEdgeType } from "@/components/edges/WeightedEdge";
import type { NumberNodeType } from "@/components/nodes/NumberNode";
import { isWireClip, type WireClip } from "./clips";

const STORAGE_KEY = "numberflow:state";
const STORAGE_VERSION = 1;
const PAGES_STORAGE_KEY = "numberflow:pages";

type PersistedNode = Pick<NumberNodeType, "id" | "position" | "type"> & {
	data: Pick<
		NumberNodeType["data"],
		"name" | "expression" | "inputs" | "computedValue"
	>;
};

type PersistedEdge = Pick<
	WeightedEdgeType,
	"id" | "source" | "sourceHandle" | "target" | "targetHandle" | "type"
>;

type PersistedState = {
	version: typeof STORAGE_VERSION;
	nodes: PersistedNode[];
	edges: PersistedEdge[];
};

export type FlowState = {
	nodes: NumberNodeType[];
	edges: WeightedEdgeType[];
};

export type FlowPage = FlowState & {
	id: string;
	name: string;
	viewport: Viewport;
	clips: WireClip[];
};

export type WorkspaceState = {
	pages: FlowPage[];
	activePageId: string;
};

export const createPage = (name: string): FlowPage => ({
	id: crypto.randomUUID(),
	name,
	nodes: [],
	edges: [],
	clips: [],
	viewport: { x: 0, y: 0, zoom: 1 },
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const isPosition = (value: unknown): value is NumberNodeType["position"] =>
	isRecord(value) && typeof value.x === "number" && typeof value.y === "number";

const isNodeData = (value: unknown): value is PersistedNode["data"] =>
	isRecord(value) &&
	(value.name === undefined || typeof value.name === "string") &&
	typeof value.expression === "string" &&
	Array.isArray(value.inputs) &&
	value.inputs.every((input) => typeof input === "string") &&
	(value.computedValue === null || typeof value.computedValue === "number");

const isPersistedNode = (value: unknown): value is PersistedNode =>
	isRecord(value) &&
	typeof value.id === "string" &&
	value.type === "number" &&
	isPosition(value.position) &&
	isNodeData(value.data);

const isNullableString = (value: unknown): value is string | null =>
	typeof value === "string" || value === null;

const isPersistedEdge = (value: unknown): value is PersistedEdge =>
	isRecord(value) &&
	typeof value.id === "string" &&
	value.type === "weighted" &&
	typeof value.source === "string" &&
	typeof value.target === "string" &&
	(value.sourceHandle === undefined || isNullableString(value.sourceHandle)) &&
	(value.targetHandle === undefined || isNullableString(value.targetHandle));

const isPersistedState = (value: unknown): value is PersistedState =>
	isRecord(value) &&
	value.version === STORAGE_VERSION &&
	Array.isArray(value.nodes) &&
	value.nodes.every(isPersistedNode) &&
	Array.isArray(value.edges) &&
	value.edges.every(isPersistedEdge);

const toPersistedState = (
	nodes: NumberNodeType[],
	edges: WeightedEdgeType[],
): PersistedState => ({
	version: STORAGE_VERSION,
	nodes: nodes.map(({ data, id, position, type }) => ({
		id,
		type,
		position: { x: position.x, y: position.y },
		data: {
			...(data.name ? { name: data.name } : {}),
			expression: data.expression,
			inputs: data.inputs,
			computedValue: data.computedValue,
		},
	})),
	edges: edges.map(
		({ id, source, sourceHandle, target, targetHandle, type }) => ({
			id,
			source,
			sourceHandle,
			target,
			targetHandle,
			type,
		}),
	),
});

export const loadFlowState = (): FlowState => {
	if (typeof window === "undefined") {
		return { nodes: [], edges: [] };
	}

	try {
		const storedState = window.localStorage.getItem(STORAGE_KEY);
		if (!storedState) {
			return { nodes: [], edges: [] };
		}

		const parsedState = JSON.parse(storedState) as unknown;
		if (!isPersistedState(parsedState)) {
			return { nodes: [], edges: [] };
		}

		return {
			nodes: parsedState.nodes as NumberNodeType[],
			edges: parsedState.edges as WeightedEdgeType[],
		};
	} catch {
		return { nodes: [], edges: [] };
	}
};

const isViewport = (value: unknown): value is Viewport =>
	isPosition(value) &&
	Number.isFinite(value.x) &&
	Number.isFinite(value.y) &&
	"zoom" in value &&
	typeof value.zoom === "number" &&
	Number.isFinite(value.zoom) &&
	value.zoom > 0;

const isPage = (value: unknown): value is FlowPage =>
	isRecord(value) &&
	typeof value.id === "string" &&
	typeof value.name === "string" &&
	value.name.trim().length > 0 &&
	isViewport(value.viewport) &&
	Array.isArray(value.nodes) &&
	value.nodes.every(isPersistedNode) &&
	Array.isArray(value.edges) &&
	value.edges.every(isPersistedEdge) &&
	(value.clips === undefined ||
		(Array.isArray(value.clips) && value.clips.every(isWireClip)));

const restorePage = (page: FlowPage): FlowPage => ({
	...page,
	clips: page.clips ?? [],
	// Older versions used React-generated IDs for the single output handle.
	edges: page.edges.map((edge) => ({ ...edge, sourceHandle: "output" })),
});

export const loadWorkspaceState = (): WorkspaceState => {
	if (typeof window !== "undefined") {
		try {
			const stored = window.localStorage.getItem(PAGES_STORAGE_KEY);
			const parsed: unknown = stored ? JSON.parse(stored) : null;
			if (
				isRecord(parsed) &&
				parsed.version === STORAGE_VERSION &&
				Array.isArray(parsed.pages) &&
				parsed.pages.length > 0 &&
				parsed.pages.every(isPage) &&
				new Set(parsed.pages.map((page) => page.id)).size ===
					parsed.pages.length
			) {
				const pages = parsed.pages.map(restorePage);
				return {
					pages,
					activePageId: pages.some((page) => page.id === parsed.activePageId)
						? (parsed.activePageId as string)
						: pages[0].id,
				};
			}
		} catch {
			// Fall back to the original saved canvas if page storage is unavailable.
		}
	}
	const page = restorePage({ ...createPage("Page 1"), ...loadFlowState() });
	return { pages: [page], activePageId: page.id };
};

export const saveWorkspaceState = ({ pages, activePageId }: WorkspaceState) => {
	if (typeof window === "undefined") return;

	try {
		window.localStorage.setItem(
			PAGES_STORAGE_KEY,
			JSON.stringify({
				version: STORAGE_VERSION,
				activePageId,
				pages: pages.map((page) => {
					const { nodes, edges } = toPersistedState(page.nodes, page.edges);
					return {
						id: page.id,
						name: page.name,
						viewport: page.viewport,
						clips: page.clips
							.map((clip) => ({
								...clip,
								edgeIds: clip.edgeIds.filter((id) =>
									page.edges.some((edge) => edge.id === id),
								),
							}))
							.filter((clip) => clip.edgeIds.length > 0),
						nodes,
						edges,
					};
				}),
			}),
		);
	} catch {
		// Storage can fail in private browsing or under quota pressure.
	}
};
