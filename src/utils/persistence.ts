import type { WeightedEdgeType } from "@/components/edges/WeightedEdge";
import type { NumberNodeType } from "@/components/nodes/NumberNode";

const STORAGE_KEY = "numberflow:state";
const STORAGE_VERSION = 1;

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

export const saveFlowState = (
	nodes: NumberNodeType[],
	edges: WeightedEdgeType[],
) => {
	if (typeof window === "undefined") {
		return;
	}

	try {
		window.localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify(toPersistedState(nodes, edges)),
		);
	} catch {
		// Storage can fail in private browsing or under quota pressure.
	}
};
