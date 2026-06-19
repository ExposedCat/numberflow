import {
	addEdge,
	Background,
	BackgroundVariant,
	type Connection,
	Panel,
	ReactFlow,
	type ReactFlowInstance,
	type SnapGrid,
	useEdgesState,
	useNodesState,
} from "@xyflow/react";
import {
	type FC,
	type MouseEvent,
	useCallback,
	useMemo,
	useRef,
	useState,
} from "react";
import { MdGridOn } from "react-icons/md";
import { styled } from "@/theme";
import { Box } from "../ui/Box";

import "@xyflow/react/dist/style.css";
import {
	WeightedConnectionLine,
	WeightedEdge,
	type WeightedEdgeType,
} from "../edges/WeightedEdge";
import { NumberNode, type NumberNodeType } from "../nodes/NumberNode";

const SNAP_GRID: SnapGrid = [20, 20];

const SnapToggleButton = styled("button", {
	alignItems: "center",
	backgroundColor: "$white",
	border: "1px solid $border-default",
	borderRadius: "$inner",
	boxShadow: "0 0.25rem 0.75rem rgba(29, 28, 28, 0.12)",
	color: "$text-primary",
	cursor: "pointer",
	display: "inline-flex",
	fontFamily: "inherit",
	fontSize: "$small",
	fontWeight: "$semibold",
	gap: "$xs",
	height: "2.25rem",
	paddingInline: "$sm",

	"&:hover": {
		backgroundColor: "#f8fafc",
	},

	variants: {
		active: {
			true: {
				backgroundColor: "$interactive-primary",
				borderColor: "$interactive-primary",
				color: "$text-inverse",

				"&:hover": {
					backgroundColor: "$interactive-primary-hover",
				},
			},
		},
	},
});

export const Root: FC = () => {
	const [nodes, setNodes, onNodesChange] = useNodesState<NumberNodeType>([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState<WeightedEdgeType>([]);
	const [snapToGrid, setSnapToGrid] = useState(false);
	const reactFlowRef =
		useRef<ReactFlowInstance<NumberNodeType, WeightedEdgeType>>(null);

	const buildEdge = useCallback((connection: Connection): WeightedEdgeType => {
		const edgeId = `e-${connection.source}-${connection.sourceHandle ?? "s"}-${connection.target}-${connection.targetHandle ?? "t"}-${Date.now()}`;
		return {
			id: edgeId,
			...connection,
			type: "weighted",
		};
	}, []);

	const createNumberNode = useCallback(
		(id: string, position: NumberNodeType["position"]): NumberNodeType => ({
			id,
			type: "number" as const,
			position,
			data: { expression: "", inputs: [], computedValue: null },
		}),
		[],
	);

	const onConnect = useCallback(
		(connection: Connection) =>
			setEdges((prev) => addEdge(buildEdge(connection), prev)),
		[buildEdge, setEdges],
	);
	const onPaneClick = useCallback(
		(event: MouseEvent) => {
			if (event.detail !== 2) return;

			const position = reactFlowRef.current?.screenToFlowPosition(
				{
					x: event.clientX,
					y: event.clientY,
				},
				{ snapToGrid },
			);
			if (!position) return;

			const id = Date.now().toString();
			setNodes((prev) => [...prev, createNumberNode(id, position)]);
		},
		[createNumberNode, setNodes, snapToGrid],
	);

	const nodeTypes = useMemo(() => ({ number: NumberNode }), []);
	const edgeTypes = useMemo(() => ({ weighted: WeightedEdge }), []);

	return (
		<Box column center style={{ width: "100vw", height: "100vh" }}>
			<ReactFlow
				{...{ nodes, edges, onNodesChange, onEdgesChange, onConnect }}
				nodeTypes={nodeTypes}
				edgeTypes={edgeTypes}
				connectionLineComponent={WeightedConnectionLine}
				onInit={(reactFlow) => {
					reactFlowRef.current = reactFlow;
				}}
				onPaneClick={onPaneClick}
				panOnDrag={[1]}
				panOnScroll
				snapGrid={SNAP_GRID}
				snapToGrid={snapToGrid}
				zoomOnDoubleClick={false}
				zoomOnScroll={false}
			>
				<Panel position="top-right">
					<SnapToggleButton
						active={snapToGrid}
						aria-label={`${snapToGrid ? "Disable" : "Enable"} grid snapping`}
						aria-pressed={snapToGrid}
						className="nopan"
						onClick={() => setSnapToGrid((enabled) => !enabled)}
						title={`${snapToGrid ? "Disable" : "Enable"} grid snapping`}
						type="button"
					>
						<MdGridOn aria-hidden size={18} />
						Snap
					</SnapToggleButton>
				</Panel>
				<Background
					id="fine-grid"
					color="#94a3b8"
					gap={20}
					size={1.3}
					variant={BackgroundVariant.Dots}
				/>
				<Background
					id="major-grid"
					color="#94a3b8"
					gap={100}
					size={1.3}
					variant={BackgroundVariant.Dots}
				/>
			</ReactFlow>
		</Box>
	);
};
