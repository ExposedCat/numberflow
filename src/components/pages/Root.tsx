import {
	addEdge,
	applyEdgeChanges,
	applyNodeChanges,
	type Connection,
	type Edge,
	type EdgeChange,
	type Node,
	type NodeChange,
	ReactFlow,
} from "@xyflow/react";
import { type FC, useCallback, useState } from "react";
import { Box } from "../ui/Box";

import "@xyflow/react/dist/style.css";
import { Button } from "../ui/Button";

export const Root: FC = () => {
	const [nodes, setNodes] = useState<Node[]>([]);
	const [edges, setEdges] = useState<Edge[]>([]);

	const onNodesChange = useCallback(
		(changes: NodeChange[]) =>
			setNodes((prev) => applyNodeChanges(changes, prev)),
		[],
	);
	const onEdgesChange = useCallback(
		(changes: EdgeChange[]) =>
			setEdges((prev) => applyEdgeChanges(changes, prev)),
		[],
	);
	const onConnect = useCallback(
		(connection: Connection) => setEdges((prev) => addEdge(connection, prev)),
		[],
	);

	return (
		<Box column center style={{ width: "100vw", height: "100vh" }}>
			<Button
				label="Add Node"
				onClick={() =>
					setNodes((prev) => [
						...prev,
						{
							id: Date.now().toString(),
							position: { x: 0, y: 200 },
							data: { label: Date.now().toString() },
						},
					])
				}
			/>
			<ReactFlow
				{...{ nodes, edges, onNodesChange, onEdgesChange, onConnect }}
			/>
		</Box>
	);
};
