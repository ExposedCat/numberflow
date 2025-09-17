import {
	addEdge,
	type Connection,
	ReactFlow,
	useEdgesState,
	useNodesState,
} from "@xyflow/react";
import { type FC, useCallback, useMemo } from "react";
import { Box } from "../ui/Box";

import "@xyflow/react/dist/style.css";
import { WeightedEdge, type WeightedEdgeType } from "../edges/WeightedEdge";
import { NumberNode, type NumberNodeType } from "../nodes/NumberNode";
import { Button } from "../ui/Button";

export const Root: FC = () => {
	const [nodes, setNodes, onNodesChange] = useNodesState<NumberNodeType>([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState<WeightedEdgeType>([]);

	const buildEdge = useCallback((connection: Connection): WeightedEdgeType => {
		const edgeId = `e-${connection.source}-${connection.sourceHandle ?? "s"}-${connection.target}-${connection.targetHandle ?? "t"}-${Date.now()}`;
		return {
			id: edgeId,
			...connection,
			type: "weighted",
		};
	}, []);

	const createNumberNode = useCallback(
		(id: string): NumberNodeType => ({
			id,
			type: "number" as const,
			position: { x: 0, y: 0 },
			data: { expression: "", inputs: [], computedValue: null },
		}),
		[],
	);
	const addNumberNode = useCallback(() => {
		const id = Date.now().toString();
		setNodes((prev) => [...prev, createNumberNode(id)]);
	}, [createNumberNode, setNodes]);
	const onConnect = useCallback(
		(connection: Connection) =>
			setEdges((prev) => addEdge(buildEdge(connection), prev)),
		[buildEdge, setEdges],
	);

	const nodeTypes = useMemo(() => ({ number: NumberNode }), []);
	const edgeTypes = useMemo(() => ({ weighted: WeightedEdge }), []);

	return (
		<Box column center style={{ width: "100vw", height: "100vh" }}>
			<Button label="Add Number Node" onClick={addNumberNode} />
			<ReactFlow
				{...{ nodes, edges, onNodesChange, onEdgesChange, onConnect }}
				nodeTypes={nodeTypes}
				edgeTypes={edgeTypes}
			/>
		</Box>
	);
};
